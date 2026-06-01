ALTER TABLE IF EXISTS public.chat_conversation_messages
  ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

UPDATE public.chat_conversation_messages AS message
SET receiver_id = CASE
  WHEN message.sender_id = conversation.owner_user_id THEN conversation.broker_user_id
  WHEN message.sender_id = conversation.broker_user_id THEN conversation.owner_user_id
  ELSE message.receiver_id
END
FROM public.chat_conversations AS conversation
WHERE conversation.id = message.conversation_id
  AND message.receiver_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conversation_messages_receiver_created_id
  ON public.chat_conversation_messages (receiver_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversation_messages_sender_created_id
  ON public.chat_conversation_messages (sender_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.set_chat_conversation_message_receiver()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_owner UUID;
  conversation_broker UUID;
  expected_receiver UUID;
BEGIN
  SELECT owner_user_id, broker_user_id
  INTO conversation_owner, conversation_broker
  FROM public.chat_conversations
  WHERE id = NEW.conversation_id;

  IF conversation_owner IS NULL OR conversation_broker IS NULL THEN
    RAISE EXCEPTION 'Conversation not found.';
  END IF;

  IF NEW.sender_id = conversation_owner THEN
    expected_receiver := conversation_broker;
  ELSIF NEW.sender_id = conversation_broker THEN
    expected_receiver := conversation_owner;
  ELSE
    RAISE EXCEPTION 'Sender is not a participant in this conversation.';
  END IF;

  IF NEW.receiver_id IS NOT NULL AND NEW.receiver_id <> expected_receiver THEN
    RAISE EXCEPTION 'Message receiver does not match this conversation.';
  END IF;

  NEW.receiver_id := expected_receiver;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_chat_conversation_message_receiver ON public.chat_conversation_messages;

CREATE TRIGGER trg_set_chat_conversation_message_receiver
BEFORE INSERT OR UPDATE OF conversation_id, sender_id, receiver_id
ON public.chat_conversation_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_chat_conversation_message_receiver();

DROP POLICY IF EXISTS "chat_conversation_messages_select" ON public.chat_conversation_messages;

CREATE POLICY "chat_conversation_messages_select" ON public.chat_conversation_messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR public.is_admin_user()
    OR EXISTS (
      SELECT 1
      FROM public.chat_conversations
      WHERE chat_conversations.id = chat_conversation_messages.conversation_id
        AND (
          chat_conversations.owner_user_id = auth.uid()
          OR chat_conversations.broker_user_id = auth.uid()
        )
    )
  );
