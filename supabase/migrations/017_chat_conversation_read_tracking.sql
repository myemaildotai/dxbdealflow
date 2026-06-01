ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS owner_last_read_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS broker_last_read_at TIMESTAMP WITH TIME ZONE;

UPDATE chat_conversations
SET
  owner_last_read_at = COALESCE(owner_last_read_at, last_message_at, updated_at, created_at),
  broker_last_read_at = COALESCE(broker_last_read_at, last_message_at, updated_at, created_at);
