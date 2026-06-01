CREATE INDEX IF NOT EXISTS idx_chat_conversations_owner_last_message_id
  ON public.chat_conversations (owner_user_id, last_message_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_broker_last_message_id
  ON public.chat_conversations (broker_user_id, last_message_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversation_messages_conversation_created_desc_id_desc
  ON public.chat_conversation_messages (conversation_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversation_messages_conversation_sender_created
  ON public.chat_conversation_messages (conversation_id, sender_id, created_at);

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
    updated_at = GREATEST(COALESCE(updated_at, message_created_at), message_created_at),
    last_message_at = GREATEST(COALESCE(last_message_at, message_created_at), message_created_at),
    owner_last_read_at = CASE
      WHEN owner_user_id = NEW.sender_id THEN GREATEST(COALESCE(owner_last_read_at, message_created_at), message_created_at)
      ELSE owner_last_read_at
    END,
    broker_last_read_at = CASE
      WHEN broker_user_id = NEW.sender_id THEN GREATEST(COALESCE(broker_last_read_at, message_created_at), message_created_at)
      ELSE broker_last_read_at
    END
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_listing_chat_message(
  p_listing_id UUID,
  p_owner_user_id UUID,
  p_broker_user_id UUID,
  p_sender_id UUID,
  p_content TEXT
)
RETURNS TABLE (
  conversation_id UUID,
  message_id UUID,
  message_created_at TIMESTAMPTZ,
  message_updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_content TEXT := NULLIF(BTRIM(p_content), '');
  target_conversation_id UUID;
  inserted_message_id UUID;
  inserted_message_created_at TIMESTAMPTZ;
  inserted_message_updated_at TIMESTAMPTZ;
BEGIN
  IF normalized_content IS NULL THEN
    RAISE EXCEPTION 'Message content is required.';
  END IF;

  IF p_owner_user_id = p_broker_user_id THEN
    RAISE EXCEPTION 'Conversation participants must be different.';
  END IF;

  IF p_sender_id <> p_owner_user_id AND p_sender_id <> p_broker_user_id THEN
    RAISE EXCEPTION 'Sender is not a participant in this conversation.';
  END IF;

  INSERT INTO public.chat_conversations (
    listing_id,
    owner_user_id,
    broker_user_id,
    owner_last_read_at,
    broker_last_read_at
  )
  VALUES (
    p_listing_id,
    p_owner_user_id,
    p_broker_user_id,
    NULL,
    NULL
  )
  ON CONFLICT (listing_id, broker_user_id)
  DO UPDATE
    SET owner_user_id = EXCLUDED.owner_user_id
    WHERE public.chat_conversations.owner_user_id = EXCLUDED.owner_user_id
  RETURNING id INTO target_conversation_id;

  IF target_conversation_id IS NULL THEN
    SELECT id
    INTO target_conversation_id
    FROM public.chat_conversations
    WHERE listing_id = p_listing_id
      AND owner_user_id = p_owner_user_id
      AND broker_user_id = p_broker_user_id;
  END IF;

  IF target_conversation_id IS NULL THEN
    RAISE EXCEPTION 'Conversation could not be created.';
  END IF;

  INSERT INTO public.chat_conversation_messages (
    conversation_id,
    sender_id,
    content
  )
  VALUES (
    target_conversation_id,
    p_sender_id,
    normalized_content
  )
  RETURNING id, created_at, updated_at
  INTO inserted_message_id, inserted_message_created_at, inserted_message_updated_at;

  RETURN QUERY SELECT
    target_conversation_id,
    inserted_message_id,
    inserted_message_created_at,
    inserted_message_updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.send_listing_chat_message(UUID, UUID, UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_listing_chat_message(UUID, UUID, UUID, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.send_listing_chat_message(UUID, UUID, UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.send_listing_chat_message(UUID, UUID, UUID, UUID, TEXT) TO service_role;
