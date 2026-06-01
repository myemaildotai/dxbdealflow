CREATE SEQUENCE IF NOT EXISTS public.chat_conversation_message_sequence_seq;

ALTER TABLE IF EXISTS public.chat_conversation_messages
  ADD COLUMN IF NOT EXISTS client_message_id UUID,
  ADD COLUMN IF NOT EXISTS message_sequence BIGINT,
  ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.chat_conversations
  ADD COLUMN IF NOT EXISTS last_message_id UUID REFERENCES public.chat_conversation_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_message_sequence BIGINT,
  ADD COLUMN IF NOT EXISTS owner_last_read_sequence BIGINT,
  ADD COLUMN IF NOT EXISTS broker_last_read_sequence BIGINT;

UPDATE public.chat_conversation_messages AS message
SET receiver_id = CASE
  WHEN message.sender_id = conversation.owner_user_id THEN conversation.broker_user_id
  WHEN message.sender_id = conversation.broker_user_id THEN conversation.owner_user_id
  ELSE message.receiver_id
END
FROM public.chat_conversations AS conversation
WHERE conversation.id = message.conversation_id
  AND message.receiver_id IS NULL;

WITH sequence_base AS (
  SELECT COALESCE(MAX(message.message_sequence), 0) AS max_sequence
  FROM public.chat_conversation_messages AS message
),
missing_sequences AS (
  SELECT
    message.id,
    sequence_base.max_sequence + ROW_NUMBER() OVER (ORDER BY message.created_at, message.id) AS next_sequence
  FROM public.chat_conversation_messages AS message
  CROSS JOIN sequence_base
  WHERE message.message_sequence IS NULL
)
UPDATE public.chat_conversation_messages AS message
SET message_sequence = missing_sequences.next_sequence
FROM missing_sequences
WHERE missing_sequences.id = message.id;

SELECT setval(
  'public.chat_conversation_message_sequence_seq',
  GREATEST(COALESCE((SELECT MAX(message.message_sequence) FROM public.chat_conversation_messages AS message), 0), 1),
  COALESCE((SELECT MAX(message.message_sequence) FROM public.chat_conversation_messages AS message), 0) > 0
);

ALTER TABLE IF EXISTS public.chat_conversation_messages
  ALTER COLUMN message_sequence SET DEFAULT nextval('public.chat_conversation_message_sequence_seq'),
  ALTER COLUMN message_sequence SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_conversation_messages_message_sequence_unique
  ON public.chat_conversation_messages (message_sequence);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_conversation_messages_sender_client_message_id
  ON public.chat_conversation_messages (sender_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conversation_messages_conversation_sequence_desc
  ON public.chat_conversation_messages (conversation_id, message_sequence DESC, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversation_messages_receiver_sequence_desc
  ON public.chat_conversation_messages (receiver_id, message_sequence DESC, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversation_messages_unread_lookup
  ON public.chat_conversation_messages (conversation_id, receiver_id, message_sequence DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_owner_sequence_id
  ON public.chat_conversations (owner_user_id, last_message_sequence DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_broker_sequence_id
  ON public.chat_conversations (broker_user_id, last_message_sequence DESC, id DESC);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversation_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

WITH latest_messages AS (
  SELECT DISTINCT ON (message.conversation_id)
    message.conversation_id,
    message.id,
    message.sender_id,
    message.created_at,
    message.message_sequence
  FROM public.chat_conversation_messages AS message
  ORDER BY message.conversation_id, message.message_sequence DESC, message.created_at DESC, message.id DESC
)
UPDATE public.chat_conversations AS conversation
SET
  last_message_id = latest_messages.id,
  last_sender_id = latest_messages.sender_id,
  last_message_at = latest_messages.created_at,
  last_message_sequence = latest_messages.message_sequence,
  updated_at = GREATEST(COALESCE(conversation.updated_at, latest_messages.created_at), latest_messages.created_at)
FROM latest_messages
WHERE latest_messages.conversation_id = conversation.id;

UPDATE public.chat_conversations AS conversation
SET
  owner_last_read_sequence = CASE
    WHEN owner_last_read_at IS NULL THEN owner_last_read_sequence
    ELSE COALESCE((
      SELECT MAX(message.message_sequence)
      FROM public.chat_conversation_messages AS message
      WHERE message.conversation_id = conversation.id
        AND message.created_at <= conversation.owner_last_read_at
    ), owner_last_read_sequence)
  END,
  broker_last_read_sequence = CASE
    WHEN broker_last_read_at IS NULL THEN broker_last_read_sequence
    ELSE COALESCE((
      SELECT MAX(message.message_sequence)
      FROM public.chat_conversation_messages AS message
      WHERE message.conversation_id = conversation.id
        AND message.created_at <= conversation.broker_last_read_at
    ), broker_last_read_sequence)
  END;

CREATE OR REPLACE FUNCTION public.set_chat_conversation_message_identity()
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
  SELECT conversation.owner_user_id, conversation.broker_user_id
  INTO conversation_owner, conversation_broker
  FROM public.chat_conversations AS conversation
  WHERE conversation.id = NEW.conversation_id;

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

  IF NEW.message_sequence IS NULL THEN
    NEW.message_sequence := nextval('public.chat_conversation_message_sequence_seq');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_chat_conversation_message_receiver ON public.chat_conversation_messages;
DROP TRIGGER IF EXISTS trg_set_chat_conversation_message_identity ON public.chat_conversation_messages;

CREATE TRIGGER trg_set_chat_conversation_message_identity
BEFORE INSERT OR UPDATE OF conversation_id, sender_id, receiver_id, message_sequence
ON public.chat_conversation_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_chat_conversation_message_identity();

CREATE OR REPLACE FUNCTION public.sync_chat_conversation_message_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  message_created_at TIMESTAMPTZ := COALESCE(NEW.created_at, CURRENT_TIMESTAMP);
BEGIN
  UPDATE public.chat_conversations AS conversation
  SET
    updated_at = CASE
      WHEN conversation.last_message_sequence IS NULL OR NEW.message_sequence >= conversation.last_message_sequence THEN message_created_at
      ELSE conversation.updated_at
    END,
    last_message_at = CASE
      WHEN conversation.last_message_sequence IS NULL OR NEW.message_sequence >= conversation.last_message_sequence THEN message_created_at
      ELSE conversation.last_message_at
    END,
    last_message_id = CASE
      WHEN conversation.last_message_sequence IS NULL OR NEW.message_sequence >= conversation.last_message_sequence THEN NEW.id
      ELSE conversation.last_message_id
    END,
    last_sender_id = CASE
      WHEN conversation.last_message_sequence IS NULL OR NEW.message_sequence >= conversation.last_message_sequence THEN NEW.sender_id
      ELSE conversation.last_sender_id
    END,
    last_message_sequence = CASE
      WHEN conversation.last_message_sequence IS NULL OR NEW.message_sequence >= conversation.last_message_sequence THEN NEW.message_sequence
      ELSE conversation.last_message_sequence
    END,
    owner_last_read_at = CASE
      WHEN conversation.owner_user_id = NEW.sender_id
        AND NEW.message_sequence > COALESCE(conversation.owner_last_read_sequence, 0)
      THEN message_created_at
      ELSE conversation.owner_last_read_at
    END,
    owner_last_read_sequence = CASE
      WHEN conversation.owner_user_id = NEW.sender_id
      THEN GREATEST(COALESCE(conversation.owner_last_read_sequence, 0), NEW.message_sequence)
      ELSE conversation.owner_last_read_sequence
    END,
    broker_last_read_at = CASE
      WHEN conversation.broker_user_id = NEW.sender_id
        AND NEW.message_sequence > COALESCE(conversation.broker_last_read_sequence, 0)
      THEN message_created_at
      ELSE conversation.broker_last_read_at
    END,
    broker_last_read_sequence = CASE
      WHEN conversation.broker_user_id = NEW.sender_id
      THEN GREATEST(COALESCE(conversation.broker_last_read_sequence, 0), NEW.message_sequence)
      ELSE conversation.broker_last_read_sequence
    END
  WHERE conversation.id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_chat_conversation_message_state ON public.chat_conversation_messages;

CREATE TRIGGER trg_sync_chat_conversation_message_state
AFTER INSERT ON public.chat_conversation_messages
FOR EACH ROW
EXECUTE FUNCTION public.sync_chat_conversation_message_state();

CREATE OR REPLACE FUNCTION public.get_existing_chat_message_for_client_id(
  p_sender_id UUID,
  p_client_message_id UUID
)
RETURNS TABLE (
  conversation_id UUID,
  message_id UUID,
  message_created_at TIMESTAMPTZ,
  message_updated_at TIMESTAMPTZ,
  receiver_id UUID,
  client_message_id UUID,
  message_sequence BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    message.conversation_id,
    message.id,
    message.created_at,
    message.updated_at,
    message.receiver_id,
    message.client_message_id,
    message.message_sequence
  FROM public.chat_conversation_messages AS message
  WHERE message.sender_id = p_sender_id
    AND message.client_message_id = p_client_message_id
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.send_listing_chat_message(UUID, UUID, UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.send_listing_chat_message(
  p_listing_id UUID,
  p_owner_user_id UUID,
  p_broker_user_id UUID,
  p_sender_id UUID,
  p_content TEXT,
  p_client_message_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conversation_id UUID,
  message_id UUID,
  message_created_at TIMESTAMPTZ,
  message_updated_at TIMESTAMPTZ,
  receiver_id UUID,
  client_message_id UUID,
  message_sequence BIGINT
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
  inserted_receiver_id UUID;
  inserted_client_message_id UUID;
  inserted_message_sequence BIGINT;
  listing_record RECORD;
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

  SELECT listing.id, listing.created_by, listing.status, listing.is_visible, listing.deleted_at
  INTO listing_record
  FROM public.listings AS listing
  WHERE listing.id = p_listing_id;

  IF listing_record.id IS NULL
    OR listing_record.created_by <> p_owner_user_id
    OR listing_record.deleted_at IS NOT NULL
    OR listing_record.is_visible IS DISTINCT FROM true
    OR listing_record.status NOT IN ('active', 'approved') THEN
    RAISE EXCEPTION 'Listing chat is unavailable.';
  END IF;

  IF p_client_message_id IS NOT NULL THEN
    RETURN QUERY
      SELECT
        existing_message.conversation_id,
        existing_message.message_id,
        existing_message.message_created_at,
        existing_message.message_updated_at,
        existing_message.receiver_id,
        existing_message.client_message_id,
        existing_message.message_sequence
      FROM public.get_existing_chat_message_for_client_id(p_sender_id, p_client_message_id) AS existing_message;

    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.chat_conversations (
    listing_id,
    owner_user_id,
    broker_user_id,
    owner_last_read_at,
    broker_last_read_at,
    owner_last_read_sequence,
    broker_last_read_sequence
  )
  VALUES (
    p_listing_id,
    p_owner_user_id,
    p_broker_user_id,
    NULL,
    NULL,
    NULL,
    NULL
  )
  ON CONFLICT (listing_id, broker_user_id)
  DO UPDATE
    SET owner_user_id = EXCLUDED.owner_user_id
    WHERE public.chat_conversations.owner_user_id = EXCLUDED.owner_user_id
  RETURNING public.chat_conversations.id INTO target_conversation_id;

  IF target_conversation_id IS NULL THEN
    SELECT conversation.id
    INTO target_conversation_id
    FROM public.chat_conversations AS conversation
    WHERE conversation.listing_id = p_listing_id
      AND conversation.owner_user_id = p_owner_user_id
      AND conversation.broker_user_id = p_broker_user_id;
  END IF;

  IF target_conversation_id IS NULL THEN
    RAISE EXCEPTION 'Conversation could not be created.';
  END IF;

  BEGIN
    INSERT INTO public.chat_conversation_messages (
      conversation_id,
      sender_id,
      client_message_id,
      content
    )
    VALUES (
      target_conversation_id,
      p_sender_id,
      p_client_message_id,
      normalized_content
    )
    RETURNING
      public.chat_conversation_messages.id,
      public.chat_conversation_messages.created_at,
      public.chat_conversation_messages.updated_at,
      public.chat_conversation_messages.receiver_id,
      public.chat_conversation_messages.client_message_id,
      public.chat_conversation_messages.message_sequence
    INTO inserted_message_id, inserted_message_created_at, inserted_message_updated_at, inserted_receiver_id, inserted_client_message_id, inserted_message_sequence;
  EXCEPTION WHEN unique_violation THEN
    IF p_client_message_id IS NULL THEN
      RAISE;
    END IF;

    RETURN QUERY
      SELECT
        existing_message.conversation_id,
        existing_message.message_id,
        existing_message.message_created_at,
        existing_message.message_updated_at,
        existing_message.receiver_id,
        existing_message.client_message_id,
        existing_message.message_sequence
      FROM public.get_existing_chat_message_for_client_id(p_sender_id, p_client_message_id) AS existing_message;
    RETURN;
  END;

  RETURN QUERY SELECT
    target_conversation_id,
    inserted_message_id,
    inserted_message_created_at,
    inserted_message_updated_at,
    inserted_receiver_id,
    inserted_client_message_id,
    inserted_message_sequence;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_chat_conversation_message(
  p_conversation_id UUID,
  p_sender_id UUID,
  p_content TEXT,
  p_client_message_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conversation_id UUID,
  message_id UUID,
  message_created_at TIMESTAMPTZ,
  message_updated_at TIMESTAMPTZ,
  receiver_id UUID,
  client_message_id UUID,
  message_sequence BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_content TEXT := NULLIF(BTRIM(p_content), '');
  conversation_record RECORD;
  listing_record RECORD;
  inserted_message_id UUID;
  inserted_message_created_at TIMESTAMPTZ;
  inserted_message_updated_at TIMESTAMPTZ;
  inserted_receiver_id UUID;
  inserted_client_message_id UUID;
  inserted_message_sequence BIGINT;
BEGIN
  IF normalized_content IS NULL THEN
    RAISE EXCEPTION 'Message content is required.';
  END IF;

  SELECT conversation.*
  INTO conversation_record
  FROM public.chat_conversations AS conversation
  WHERE conversation.id = p_conversation_id;

  IF conversation_record.id IS NULL THEN
    RAISE EXCEPTION 'Conversation not found.';
  END IF;

  IF p_sender_id <> conversation_record.owner_user_id AND p_sender_id <> conversation_record.broker_user_id THEN
    RAISE EXCEPTION 'Sender is not a participant in this conversation.';
  END IF;

  SELECT listing.id, listing.status, listing.is_visible, listing.deleted_at
  INTO listing_record
  FROM public.listings AS listing
  WHERE listing.id = conversation_record.listing_id;

  IF listing_record.id IS NULL
    OR listing_record.deleted_at IS NOT NULL
    OR listing_record.is_visible IS DISTINCT FROM true
    OR listing_record.status NOT IN ('active', 'approved') THEN
    RAISE EXCEPTION 'This listing is no longer active. Messaging is disabled.';
  END IF;

  IF p_client_message_id IS NOT NULL THEN
    RETURN QUERY
      SELECT
        existing_message.conversation_id,
        existing_message.message_id,
        existing_message.message_created_at,
        existing_message.message_updated_at,
        existing_message.receiver_id,
        existing_message.client_message_id,
        existing_message.message_sequence
      FROM public.get_existing_chat_message_for_client_id(p_sender_id, p_client_message_id) AS existing_message;

    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.chat_conversation_messages (
      conversation_id,
      sender_id,
      client_message_id,
      content
    )
    VALUES (
      p_conversation_id,
      p_sender_id,
      p_client_message_id,
      normalized_content
    )
    RETURNING
      public.chat_conversation_messages.id,
      public.chat_conversation_messages.created_at,
      public.chat_conversation_messages.updated_at,
      public.chat_conversation_messages.receiver_id,
      public.chat_conversation_messages.client_message_id,
      public.chat_conversation_messages.message_sequence
    INTO inserted_message_id, inserted_message_created_at, inserted_message_updated_at, inserted_receiver_id, inserted_client_message_id, inserted_message_sequence;
  EXCEPTION WHEN unique_violation THEN
    IF p_client_message_id IS NULL THEN
      RAISE;
    END IF;

    RETURN QUERY
      SELECT
        existing_message.conversation_id,
        existing_message.message_id,
        existing_message.message_created_at,
        existing_message.message_updated_at,
        existing_message.receiver_id,
        existing_message.client_message_id,
        existing_message.message_sequence
      FROM public.get_existing_chat_message_for_client_id(p_sender_id, p_client_message_id) AS existing_message;
    RETURN;
  END;

  RETURN QUERY SELECT
    p_conversation_id,
    inserted_message_id,
    inserted_message_created_at,
    inserted_message_updated_at,
    inserted_receiver_id,
    inserted_client_message_id,
    inserted_message_sequence;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_chat_conversation_read(
  p_conversation_id UUID,
  p_reader_id UUID,
  p_read_until_sequence BIGINT DEFAULT NULL,
  p_read_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  read_at TIMESTAMPTZ,
  read_sequence BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_record RECORD;
  read_column_name TEXT;
  read_sequence_column_name TEXT;
  current_read_sequence BIGINT;
  target_message RECORD;
BEGIN
  SELECT conversation.*
  INTO conversation_record
  FROM public.chat_conversations AS conversation
  WHERE conversation.id = p_conversation_id;

  IF conversation_record.id IS NULL THEN
    RAISE EXCEPTION 'Conversation not found.';
  END IF;

  IF p_reader_id = conversation_record.owner_user_id THEN
    read_column_name := 'owner_last_read_at';
    read_sequence_column_name := 'owner_last_read_sequence';
    current_read_sequence := conversation_record.owner_last_read_sequence;
  ELSIF p_reader_id = conversation_record.broker_user_id THEN
    read_column_name := 'broker_last_read_at';
    read_sequence_column_name := 'broker_last_read_sequence';
    current_read_sequence := conversation_record.broker_last_read_sequence;
  ELSE
    RAISE EXCEPTION 'You cannot access this conversation.';
  END IF;

  SELECT message.created_at, message.message_sequence
  INTO target_message
  FROM public.chat_conversation_messages AS message
  WHERE message.conversation_id = p_conversation_id
    AND (p_read_until_sequence IS NULL OR message.message_sequence <= p_read_until_sequence)
    AND (p_read_at IS NULL OR message.created_at <= p_read_at)
  ORDER BY message.message_sequence DESC, message.created_at DESC, message.id DESC
  LIMIT 1;

  IF target_message.message_sequence IS NULL THEN
    RETURN QUERY SELECT
      CASE WHEN read_column_name = 'owner_last_read_at' THEN conversation_record.owner_last_read_at ELSE conversation_record.broker_last_read_at END,
      current_read_sequence;
    RETURN;
  END IF;

  IF current_read_sequence IS NOT NULL AND current_read_sequence >= target_message.message_sequence THEN
    RETURN QUERY SELECT
      CASE WHEN read_column_name = 'owner_last_read_at' THEN conversation_record.owner_last_read_at ELSE conversation_record.broker_last_read_at END,
      current_read_sequence;
    RETURN;
  END IF;

  EXECUTE format(
    'UPDATE public.chat_conversations SET %I = $1, %I = $2, updated_at = GREATEST(COALESCE(public.chat_conversations.updated_at, $1), $1) WHERE public.chat_conversations.id = $3',
    read_column_name,
    read_sequence_column_name
  )
  USING target_message.created_at, target_message.message_sequence, p_conversation_id;

  RETURN QUERY SELECT target_message.created_at, target_message.message_sequence;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_broker_chat_conversation_counts(p_user_id UUID)
RETURNS TABLE (
  total_recent_conversations BIGINT,
  total_unread_conversations BIGINT,
  total_all_conversations BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT
      conversation.id,
      conversation.last_message_id,
      COALESCE(
        CASE
          WHEN conversation.owner_user_id = p_user_id THEN conversation.owner_last_read_sequence
          ELSE conversation.broker_last_read_sequence
        END,
        0
      ) AS viewer_last_read_sequence
    FROM public.chat_conversations AS conversation
    WHERE conversation.owner_user_id = p_user_id
      OR conversation.broker_user_id = p_user_id
  )
  SELECT
    COUNT(*) FILTER (WHERE scoped_conversation.last_message_id IS NOT NULL) AS total_recent_conversations,
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM public.chat_conversation_messages AS message
        WHERE message.conversation_id = scoped_conversation.id
          AND message.receiver_id = p_user_id
          AND message.message_sequence > scoped_conversation.viewer_last_read_sequence
      )
    ) AS total_unread_conversations,
    COUNT(*) AS total_all_conversations
  FROM scoped AS scoped_conversation;
$$;

CREATE OR REPLACE FUNCTION public.get_broker_chat_conversation_page(
  p_user_id UUID,
  p_filter TEXT DEFAULT 'recent',
  p_limit INTEGER DEFAULT 10,
  p_cursor_last_message_sequence BIGINT DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_message_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  listing_id UUID,
  owner_user_id UUID,
  broker_user_id UUID,
  participant_user_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  last_message_id UUID,
  last_sender_id UUID,
  last_message_sequence BIGINT,
  owner_last_read_at TIMESTAMPTZ,
  broker_last_read_at TIMESTAMPTZ,
  owner_last_read_sequence BIGINT,
  broker_last_read_sequence BIGINT,
  viewer_last_read_at TIMESTAMPTZ,
  viewer_last_read_sequence BIGINT,
  message_count BIGINT,
  unread_count BIGINT,
  messages JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT
      conversation.*,
      COALESCE(
        CASE
          WHEN conversation.owner_user_id = p_user_id THEN conversation.owner_last_read_sequence
          ELSE conversation.broker_last_read_sequence
        END,
        0
      ) AS viewer_last_read_sequence,
      COALESCE(conversation.last_message_sequence, 0) AS sort_sequence,
      EXISTS (
        SELECT 1
        FROM public.chat_conversation_messages AS unread_message
        WHERE unread_message.conversation_id = conversation.id
          AND unread_message.receiver_id = p_user_id
          AND unread_message.message_sequence > COALESCE(
            CASE
              WHEN conversation.owner_user_id = p_user_id THEN conversation.owner_last_read_sequence
              ELSE conversation.broker_last_read_sequence
            END,
            0
          )
      ) AS has_unread
    FROM public.chat_conversations AS conversation
    WHERE conversation.owner_user_id = p_user_id
      OR conversation.broker_user_id = p_user_id
  ),
  filtered AS (
    SELECT scoped_conversation.*
    FROM scoped AS scoped_conversation
    WHERE CASE
      WHEN p_filter = 'unread' THEN scoped_conversation.has_unread
      WHEN p_filter = 'all' THEN true
      ELSE scoped_conversation.last_message_id IS NOT NULL
    END
  ),
  paged AS (
    SELECT filtered_conversation.*
    FROM filtered AS filtered_conversation
    WHERE p_cursor_last_message_sequence IS NULL
      OR filtered_conversation.sort_sequence < p_cursor_last_message_sequence
      OR (
        filtered_conversation.sort_sequence = p_cursor_last_message_sequence
        AND (p_cursor_id IS NULL OR filtered_conversation.id < p_cursor_id)
      )
    ORDER BY filtered_conversation.sort_sequence DESC, filtered_conversation.id DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 101)
  )
  SELECT
    paged.id,
    paged.listing_id,
    paged.owner_user_id,
    paged.broker_user_id,
    CASE WHEN paged.owner_user_id = p_user_id THEN paged.broker_user_id ELSE paged.owner_user_id END AS participant_user_id,
    paged.created_at,
    paged.updated_at,
    paged.last_message_at,
    paged.last_message_id,
    paged.last_sender_id,
    paged.last_message_sequence,
    paged.owner_last_read_at,
    paged.broker_last_read_at,
    paged.owner_last_read_sequence,
    paged.broker_last_read_sequence,
    CASE WHEN paged.owner_user_id = p_user_id THEN paged.owner_last_read_at ELSE paged.broker_last_read_at END AS viewer_last_read_at,
    paged.viewer_last_read_sequence,
    (
      SELECT COUNT(*)
      FROM public.chat_conversation_messages AS message
      WHERE message.conversation_id = paged.id
    ) AS message_count,
    (
      SELECT COUNT(*)
      FROM public.chat_conversation_messages AS unread_message
      WHERE unread_message.conversation_id = paged.id
        AND unread_message.receiver_id = p_user_id
        AND unread_message.message_sequence > paged.viewer_last_read_sequence
    ) AS unread_count,
    COALESCE((
      SELECT jsonb_agg(to_jsonb(message_page) ORDER BY message_page.message_sequence ASC, message_page.created_at ASC, message_page.id ASC)
      FROM (
        SELECT
          message.id,
          message.conversation_id,
          message.sender_id,
          message.receiver_id,
          message.client_message_id,
          message.message_sequence,
          message.content,
          message.created_at,
          message.updated_at
        FROM public.chat_conversation_messages AS message
        WHERE message.conversation_id = paged.id
        ORDER BY message.message_sequence DESC, message.created_at DESC, message.id DESC
        LIMIT LEAST(GREATEST(COALESCE(p_message_limit, 20), 1), 100)
      ) AS message_page
    ), '[]'::jsonb) AS messages
  FROM paged;
$$;

DROP POLICY IF EXISTS "chat_conversation_messages_insert" ON public.chat_conversation_messages;

DROP POLICY IF EXISTS "chat_conversation_messages_select" ON public.chat_conversation_messages;

CREATE POLICY "chat_conversation_messages_select" ON public.chat_conversation_messages
  FOR SELECT
  TO authenticated
  USING (
    chat_conversation_messages.sender_id = auth.uid()
    OR chat_conversation_messages.receiver_id = auth.uid()
    OR public.is_admin_user()
    OR EXISTS (
      SELECT 1
      FROM public.chat_conversations AS conversation
      WHERE conversation.id = chat_conversation_messages.conversation_id
        AND (
          conversation.owner_user_id = auth.uid()
          OR conversation.broker_user_id = auth.uid()
        )
    )
  );

REVOKE INSERT ON TABLE public.chat_conversation_messages FROM authenticated;
REVOKE ALL ON FUNCTION public.get_existing_chat_message_for_client_id(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_listing_chat_message(UUID, UUID, UUID, UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_chat_conversation_message(UUID, UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_chat_conversation_read(UUID, UUID, BIGINT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_broker_chat_conversation_counts(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_broker_chat_conversation_page(UUID, TEXT, INTEGER, BIGINT, UUID, INTEGER) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_existing_chat_message_for_client_id(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_listing_chat_message(UUID, UUID, UUID, UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_chat_conversation_message(UUID, UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_chat_conversation_read(UUID, UUID, BIGINT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_broker_chat_conversation_counts(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_broker_chat_conversation_page(UUID, TEXT, INTEGER, BIGINT, UUID, INTEGER) TO service_role;
