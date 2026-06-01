ALTER TABLE IF EXISTS public.chat_conversation_messages REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.chat_conversations REPLICA IDENTITY FULL;

ALTER TABLE IF EXISTS public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_conversation_messages ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "chat_conversations_select" ON public.chat_conversations;

CREATE POLICY "chat_conversations_select" ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR broker_user_id = auth.uid()
    OR public.is_admin_user()
  );

DROP POLICY IF EXISTS "chat_conversation_messages_select" ON public.chat_conversation_messages;

CREATE POLICY "chat_conversation_messages_select" ON public.chat_conversation_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations
      WHERE chat_conversations.id = chat_conversation_messages.conversation_id
        AND (
          chat_conversations.owner_user_id = auth.uid()
          OR chat_conversations.broker_user_id = auth.uid()
          OR public.is_admin_user()
        )
    )
  );

DROP POLICY IF EXISTS "chat_conversation_messages_insert" ON public.chat_conversation_messages;

CREATE POLICY "chat_conversation_messages_insert" ON public.chat_conversation_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.chat_conversations
      WHERE chat_conversations.id = chat_conversation_messages.conversation_id
        AND (
          chat_conversations.owner_user_id = auth.uid()
          OR chat_conversations.broker_user_id = auth.uid()
        )
    )
  );
