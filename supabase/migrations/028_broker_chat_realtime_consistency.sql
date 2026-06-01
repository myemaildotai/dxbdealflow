ALTER TABLE IF EXISTS public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.chat_conversation_messages REPLICA IDENTITY FULL;

GRANT SELECT ON TABLE public.chat_conversations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.chat_conversation_messages TO authenticated;

DO $$
DECLARE
  realtime_table TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH realtime_table IN ARRAY ARRAY['chat_conversations', 'chat_conversation_messages']
    LOOP
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = realtime_table
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = realtime_table
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', realtime_table);
      END IF;
    END LOOP;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_conversation_messages_conversation_created_id
  ON public.chat_conversation_messages (conversation_id, created_at, id);

CREATE OR REPLACE FUNCTION public.sync_chat_conversation_message_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  message_created_at TIMESTAMPTZ := COALESCE(NEW.created_at, CURRENT_TIMESTAMP);
BEGIN
  UPDATE public.chat_conversations
  SET
    updated_at = message_created_at,
    last_message_at = message_created_at,
    owner_last_read_at = CASE
      WHEN owner_user_id = NEW.sender_id THEN message_created_at
      ELSE owner_last_read_at
    END,
    broker_last_read_at = CASE
      WHEN broker_user_id = NEW.sender_id THEN message_created_at
      ELSE broker_last_read_at
    END
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_chat_conversation_message_state ON public.chat_conversation_messages;

CREATE TRIGGER trg_sync_chat_conversation_message_state
AFTER INSERT ON public.chat_conversation_messages
FOR EACH ROW
EXECUTE FUNCTION public.sync_chat_conversation_message_state();
