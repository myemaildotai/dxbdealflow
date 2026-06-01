ALTER TABLE chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE chat_conversation_messages REPLICA IDENTITY FULL;
ALTER TABLE chat_participants REPLICA IDENTITY FULL;

GRANT SELECT ON TABLE chat_conversations, chat_conversation_messages, chat_participants TO authenticated;
GRANT INSERT ON TABLE chat_conversation_messages TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'chat_conversations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'chat_conversation_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversation_messages;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'chat_participants'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
    END IF;
  END IF;
END $$;

DROP POLICY IF EXISTS "chat_conversations_select" ON chat_conversations;

CREATE POLICY "chat_conversations_select" ON chat_conversations
  FOR SELECT
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR broker_user_id = auth.uid()
    OR public.is_admin_user()
  );

DROP POLICY IF EXISTS "chat_conversation_messages_select" ON chat_conversation_messages;

CREATE POLICY "chat_conversation_messages_select" ON chat_conversation_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM chat_conversations
      WHERE chat_conversations.id = chat_conversation_messages.conversation_id
        AND (
          chat_conversations.owner_user_id = auth.uid()
          OR chat_conversations.broker_user_id = auth.uid()
          OR public.is_admin_user()
        )
    )
  );

DROP POLICY IF EXISTS "chat_conversation_messages_insert" ON chat_conversation_messages;

CREATE POLICY "chat_conversation_messages_insert" ON chat_conversation_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM chat_conversations
      WHERE chat_conversations.id = chat_conversation_messages.conversation_id
        AND (
          chat_conversations.owner_user_id = auth.uid()
          OR chat_conversations.broker_user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "chat_participants_select" ON chat_participants;

CREATE POLICY "chat_participants_select" ON chat_participants
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user());
