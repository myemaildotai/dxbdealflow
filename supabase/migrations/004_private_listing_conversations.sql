CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(listing_id, broker_user_id)
);

CREATE TABLE IF NOT EXISTS chat_conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_listing_id ON chat_conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_owner_user_id ON chat_conversations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_broker_user_id ON chat_conversations(broker_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message_at ON chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversation_messages_conversation_id ON chat_conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversation_messages_sender_id ON chat_conversation_messages(sender_id);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_conversations_select" ON chat_conversations
  FOR SELECT USING (
    owner_user_id = auth.uid()
    OR broker_user_id = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "chat_conversation_messages_select" ON chat_conversation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM chat_conversations
      WHERE chat_conversations.id = chat_conversation_messages.conversation_id
        AND (
          chat_conversations.owner_user_id = auth.uid()
          OR chat_conversations.broker_user_id = auth.uid()
          OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
        )
    )
  );
