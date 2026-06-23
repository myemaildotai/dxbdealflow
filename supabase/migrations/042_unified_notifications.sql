CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('admin', 'broker')),
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  href TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  status TEXT NOT NULL DEFAULT 'active',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  handled_at TIMESTAMP WITH TIME ZONE,
  handled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sort_unread SMALLINT GENERATED ALWAYS AS (CASE WHEN is_read THEN 1 ELSE 0 END) STORED,
  priority_rank SMALLINT GENERATED ALWAYS AS (
    CASE priority
      WHEN 'urgent' THEN 0
      WHEN 'high' THEN 1
      WHEN 'normal' THEN 2
      ELSE 3
    END
  ) STORED
);

COMMENT ON TABLE public.notifications IS
  'Unified persisted notification feed for admin and broker users.';
COMMENT ON TABLE public.admin_priority_queue_notifications IS
  'Deprecated after migration 042. Retained temporarily for rollback and audit only.';
COMMENT ON TABLE public.broker_notifications IS
  'Deprecated after migration 042. Retained temporarily for rollback and audit only.';

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read_created
  ON public.notifications (recipient_user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_handled_created
  ON public.notifications (recipient_user_id, handled_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_sort
  ON public.notifications (recipient_user_id, status, sort_unread, priority_rank, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_role_created
  ON public.notifications (recipient_role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_entity
  ON public.notifications (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type_created
  ON public.notifications (type, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_active_entity
  ON public.notifications (recipient_user_id, type, entity_type, entity_id)
  WHERE status = 'active' AND entity_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_notification_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;

CREATE TRIGGER trg_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.set_notification_updated_at();

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;

CREATE POLICY notifications_select_own ON public.notifications
FOR SELECT TO authenticated
USING (recipient_user_id = auth.uid());

CREATE POLICY notifications_update_own ON public.notifications
FOR UPDATE TO authenticated
USING (recipient_user_id = auth.uid())
WITH CHECK (recipient_user_id = auth.uid());

GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT UPDATE (is_read, read_at) ON TABLE public.notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_notification(
  p_recipient_user_id UUID,
  p_recipient_role TEXT,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_href TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_metadata JSONB DEFAULT '{}'::JSONB,
  p_created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    recipient_user_id,
    recipient_role,
    actor_user_id,
    type,
    title,
    message,
    entity_type,
    entity_id,
    href,
    priority,
    metadata,
    created_at
  )
  VALUES (
    p_recipient_user_id,
    p_recipient_role,
    p_actor_user_id,
    p_type,
    p_title,
    p_message,
    p_entity_type,
    p_entity_id,
    p_href,
    p_priority,
    COALESCE(p_metadata, '{}'::JSONB),
    COALESCE(p_created_at, CURRENT_TIMESTAMP)
  )
  ON CONFLICT (recipient_user_id, type, entity_type, entity_id)
    WHERE status = 'active' AND entity_id IS NOT NULL
  DO UPDATE SET
    actor_user_id = EXCLUDED.actor_user_id,
    title = CASE
      WHEN EXCLUDED.type = 'chat_message_received'
        AND COALESCE((public.notifications.metadata ->> 'unreadCount')::INTEGER, 0) + 1 > 1
      THEN
        (COALESCE((public.notifications.metadata ->> 'unreadCount')::INTEGER, 0) + 1)::TEXT
        || ' unread messages from '
        || regexp_replace(EXCLUDED.title, '^New message from ', '')
      ELSE EXCLUDED.title
    END,
    message = EXCLUDED.message,
    href = EXCLUDED.href,
    priority = EXCLUDED.priority,
    metadata = public.notifications.metadata || EXCLUDED.metadata ||
      CASE
        WHEN EXCLUDED.type = 'chat_message_received'
        THEN jsonb_build_object(
          'unreadCount',
          COALESCE((public.notifications.metadata ->> 'unreadCount')::INTEGER, 0) + 1
        )
        ELSE '{}'::JSONB
      END,
    is_read = CASE WHEN EXCLUDED.type = 'chat_message_received' THEN FALSE ELSE public.notifications.is_read END,
    read_at = CASE WHEN EXCLUDED.type = 'chat_message_received' THEN NULL ELSE public.notifications.read_at END,
    handled_at = CASE WHEN EXCLUDED.type = 'chat_message_received' THEN NULL ELSE public.notifications.handled_at END,
    handled_by = CASE WHEN EXCLUDED.type = 'chat_message_received' THEN NULL ELSE public.notifications.handled_by END,
    created_at = CASE WHEN EXCLUDED.type = 'chat_message_received' THEN EXCLUDED.created_at ELSE public.notifications.created_at END,
    updated_at = CURRENT_TIMESTAMP
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_notification(
  UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_notification(
  UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ
) TO service_role;

-- Preserve the legacy admin queue ids and read/handled state.
INSERT INTO public.notifications (
  id,
  recipient_user_id,
  recipient_role,
  type,
  title,
  message,
  entity_type,
  entity_id,
  href,
  status,
  is_read,
  read_at,
  handled_at,
  metadata,
  created_at,
  updated_at
)
SELECT
  legacy.id,
  legacy.admin_user_id,
  'admin',
  CASE legacy.target_type
    WHEN 'broker' THEN 'broker_application_pending'
    ELSE 'listing_pending_review'
  END,
  CASE legacy.target_type
    WHEN 'broker' THEN 'Broker approval pending'
    ELSE 'Listing review pending'
  END,
  legacy.sentence,
  legacy.target_type,
  legacy.target_id,
  CASE legacy.target_type
    WHEN 'broker' THEN '/admin/brokers/' || legacy.target_id::TEXT
    ELSE '/admin/listings/' || legacy.target_id::TEXT
  END,
  CASE WHEN legacy.handled_at IS NULL THEN 'active' ELSE 'handled' END,
  legacy.is_read,
  legacy.read_at,
  legacy.handled_at,
  jsonb_build_object(
    'sourceCreatedAt', legacy.source_created_at,
    'handledStatus', legacy.handled_status,
    'legacyTable', 'admin_priority_queue_notifications'
  ),
  legacy.created_at,
  legacy.updated_at
FROM public.admin_priority_queue_notifications AS legacy
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.notifications (
  recipient_user_id,
  recipient_role,
  actor_user_id,
  type,
  title,
  message,
  entity_type,
  entity_id,
  href,
  metadata,
  created_at,
  updated_at
)
SELECT
  admin_user.id,
  'admin',
  broker_user.id,
  'broker_application_pending',
  'Broker approval pending',
  COALESCE(NULLIF(TRIM(CONCAT(broker_user.first_name, ' ', broker_user.last_name)), ''), 'A broker')
    || ' submitted a broker application for review.',
  'broker',
  broker_user.id,
  '/admin/brokers/' || broker_user.id::TEXT,
  jsonb_build_object('sourceCreatedAt', broker_user.created_at),
  broker_user.created_at,
  broker_user.updated_at
FROM public.users AS admin_user
CROSS JOIN public.users AS broker_user
WHERE admin_user.role = 'admin'
  AND broker_user.role = 'broker'
  AND broker_user.status = 'pending'
ON CONFLICT (recipient_user_id, type, entity_type, entity_id)
  WHERE status = 'active' AND entity_id IS NOT NULL
DO NOTHING;

INSERT INTO public.notifications (
  recipient_user_id,
  recipient_role,
  actor_user_id,
  type,
  title,
  message,
  entity_type,
  entity_id,
  href,
  metadata,
  created_at,
  updated_at
)
SELECT
  admin_user.id,
  'admin',
  listing.created_by,
  'listing_pending_review',
  'Listing review pending',
  'Listing ''' || listing.title || ''' is waiting for review.',
  'listing',
  listing.id,
  '/admin/listings/' || listing.id::TEXT,
  jsonb_build_object('sourceCreatedAt', listing.created_at),
  listing.created_at,
  listing.updated_at
FROM public.users AS admin_user
CROSS JOIN public.listings AS listing
WHERE admin_user.role = 'admin'
  AND listing.status = 'pending'
  AND listing.deleted_at IS NULL
ON CONFLICT (recipient_user_id, type, entity_type, entity_id)
  WHERE status = 'active' AND entity_id IS NOT NULL
DO NOTHING;

-- Preserve requirement-match notifications from the legacy broker table.
INSERT INTO public.notifications (
  id,
  recipient_user_id,
  recipient_role,
  actor_user_id,
  type,
  title,
  message,
  entity_type,
  entity_id,
  href,
  is_read,
  read_at,
  metadata,
  created_at,
  updated_at
)
SELECT
  legacy.id,
  recipient.user_id,
  'broker',
  actor.user_id,
  'requirement_match_found',
  'Requirement match from ' || COALESCE(
    NULLIF(TRIM(CONCAT(actor_user.first_name, ' ', actor_user.last_name)), ''),
    'Broker'
  ),
  'for ' || COALESCE(match_listing.title, requirement.title, 'your requirement') || '.',
  'requirement_match',
  COALESCE(legacy.requirement_match_id, legacy.requirement_id),
  '/dashboard/requirements',
  legacy.is_read,
  legacy.read_at,
  jsonb_build_object(
    'requirementId', legacy.requirement_id,
    'requirementMatchId', legacy.requirement_match_id,
    'listingId', requirement_match.listing_id,
    'requirementTitle', COALESCE(match_listing.title, requirement.title),
    'legacyTable', 'broker_notifications'
  ),
  legacy.created_at,
  legacy.created_at
FROM public.broker_notifications AS legacy
JOIN public.broker_profiles AS recipient ON recipient.id = legacy.recipient_broker_id
LEFT JOIN public.broker_profiles AS actor ON actor.id = legacy.actor_broker_id
LEFT JOIN public.users AS actor_user ON actor_user.id = actor.user_id
LEFT JOIN public.requirements AS requirement ON requirement.id = legacy.requirement_id
LEFT JOIN public.requirement_matches AS requirement_match ON requirement_match.id = legacy.requirement_match_id
LEFT JOIN public.listings AS match_listing ON match_listing.id = requirement_match.listing_id
ON CONFLICT (id) DO NOTHING;

-- Backfill the other sources that previously formed the broker virtual feed.
INSERT INTO public.notifications (
  recipient_user_id,
  recipient_role,
  type,
  title,
  message,
  entity_type,
  entity_id,
  href,
  is_read,
  read_at,
  metadata,
  created_at,
  updated_at
)
SELECT
  listing.created_by,
  'broker',
  'listing_approved',
  'Listing ''' || listing.title || '''',
  'has been approved.',
  'listing',
  listing.id,
  '/dashboard/listings/' || listing.id::TEXT,
  listing.approval_notification_read_at IS NOT NULL
    AND listing.approval_notification_read_at >= listing.approved_at,
  listing.approval_notification_read_at,
  jsonb_build_object('listingId', listing.id, 'listingTitle', listing.title),
  listing.approved_at,
  COALESCE(listing.updated_at, listing.approved_at)
FROM public.listings AS listing
WHERE listing.approved_at IS NOT NULL
ON CONFLICT (recipient_user_id, type, entity_type, entity_id)
  WHERE status = 'active' AND entity_id IS NOT NULL
DO NOTHING;

INSERT INTO public.notifications (
  recipient_user_id,
  recipient_role,
  actor_user_id,
  type,
  title,
  message,
  entity_type,
  entity_id,
  href,
  is_read,
  read_at,
  metadata,
  created_at,
  updated_at
)
SELECT
  lead.to_user_id,
  'broker',
  lead.from_user_id,
  'public_enquiry_received',
  'New enquiry from ' || COALESCE(NULLIF(lead.contact_name, ''), 'Public visitor'),
  CASE WHEN listing.title IS NULL THEN 'for your listing.' ELSE 'for ' || listing.title || '.' END,
  'lead',
  lead.id,
  '/dashboard/enquiries',
  COALESCE(lead.is_read, FALSE),
  lead.read_at,
  jsonb_build_object(
    'leadId', lead.id,
    'listingId', lead.listing_id,
    'listingTitle', listing.title,
    'contactName', lead.contact_name
  ),
  lead.created_at,
  lead.created_at
FROM public.leads AS lead
LEFT JOIN public.listings AS listing ON listing.id = lead.listing_id
WHERE lead.lead_type = 'listing_enquiry'
ON CONFLICT (recipient_user_id, type, entity_type, entity_id)
  WHERE status = 'active' AND entity_id IS NOT NULL
DO NOTHING;

INSERT INTO public.notifications (
  recipient_user_id,
  recipient_role,
  actor_user_id,
  type,
  title,
  message,
  entity_type,
  entity_id,
  href,
  metadata,
  created_at,
  updated_at
)
SELECT
  message.receiver_id,
  'broker',
  message.sender_id,
  'chat_message_received',
  CASE
    WHEN unread_stats.unread_count > 1
    THEN unread_stats.unread_count::TEXT || ' unread messages from ' || COALESCE(
      NULLIF(TRIM(CONCAT(sender.first_name, ' ', sender.last_name)), ''),
      'Broker'
    )
    ELSE 'New message from ' || COALESCE(
      NULLIF(TRIM(CONCAT(sender.first_name, ' ', sender.last_name)), ''),
      'Broker'
    )
  END,
  'Regarding ' || COALESCE(listing.title, 'a listing') || '.',
  'conversation',
  conversation.id,
  '/dashboard/chats/' || conversation.id::TEXT,
  jsonb_build_object(
    'conversationId', conversation.id,
    'listingId', conversation.listing_id,
    'listingTitle', listing.title,
    'lastMessageSequence', message.message_sequence,
    'unreadCount', unread_stats.unread_count
  ),
  message.created_at,
  message.updated_at
FROM public.chat_conversation_messages AS message
JOIN public.chat_conversations AS conversation ON conversation.id = message.conversation_id
LEFT JOIN public.listings AS listing ON listing.id = conversation.listing_id
LEFT JOIN public.users AS sender ON sender.id = message.sender_id
CROSS JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS unread_count
  FROM public.chat_conversation_messages AS unread_message
  WHERE unread_message.conversation_id = conversation.id
    AND unread_message.receiver_id = message.receiver_id
    AND unread_message.message_sequence > COALESCE(
      CASE
        WHEN message.receiver_id = conversation.owner_user_id THEN conversation.owner_last_read_sequence
        ELSE conversation.broker_last_read_sequence
      END,
      0
    )
) AS unread_stats
WHERE message.receiver_id IS NOT NULL
  AND message.id = conversation.last_message_id
  AND message.message_sequence > COALESCE(
    CASE
      WHEN message.receiver_id = conversation.owner_user_id THEN conversation.owner_last_read_sequence
      ELSE conversation.broker_last_read_sequence
    END,
    0
  )
ON CONFLICT (recipient_user_id, type, entity_type, entity_id)
  WHERE status = 'active' AND entity_id IS NOT NULL
DO NOTHING;

CREATE OR REPLACE FUNCTION public.notify_pending_broker_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  broker_name TEXT;
BEGIN
  IF NEW.role <> 'broker'
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status <> 'pending' THEN
    UPDATE public.notifications
    SET
      handled_at = COALESCE(handled_at, CURRENT_TIMESTAMP),
      status = 'handled',
      metadata = metadata || jsonb_build_object('handledStatus', NEW.status)
    WHERE recipient_role = 'admin'
      AND type = 'broker_application_pending'
      AND entity_type = 'broker'
      AND entity_id = NEW.id
      AND handled_at IS NULL;

    RETURN NEW;
  END IF;

  IF NEW.status <> 'pending'
    OR (TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status)
  THEN
    RETURN NEW;
  END IF;

  broker_name := COALESCE(NULLIF(TRIM(CONCAT(NEW.first_name, ' ', NEW.last_name)), ''), 'A broker');

  FOR admin_record IN SELECT id FROM public.users WHERE role = 'admin'
  LOOP
    PERFORM public.upsert_notification(
      admin_record.id,
      'admin',
      'broker_application_pending',
      'Broker approval pending',
      broker_name || ' submitted a broker application for review.',
      NEW.id,
      'broker',
      NEW.id,
      '/admin/brokers/' || NEW.id::TEXT,
      'normal',
      jsonb_build_object('sourceCreatedAt', NEW.created_at),
      NEW.created_at
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_pending_broker_application ON public.users;
CREATE TRIGGER trg_notify_pending_broker_application
AFTER INSERT OR UPDATE OF status ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.notify_pending_broker_application();

CREATE OR REPLACE FUNCTION public.notify_listing_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  handled_timestamp TIMESTAMPTZ := CURRENT_TIMESTAMP;
BEGIN
  IF NEW.status = 'pending'
    AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    FOR admin_record IN SELECT id FROM public.users WHERE role = 'admin'
    LOOP
      PERFORM public.upsert_notification(
        admin_record.id,
        'admin',
        'listing_pending_review',
        'Listing review pending',
        'Listing ''' || NEW.title || ''' is waiting for review.',
        NEW.created_by,
        'listing',
        NEW.id,
        '/admin/listings/' || NEW.id::TEXT,
        'normal',
        jsonb_build_object('sourceCreatedAt', NEW.created_at),
        NEW.created_at
      );
    END LOOP;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status <> 'pending' THEN
    UPDATE public.notifications
    SET
      handled_at = COALESCE(handled_at, handled_timestamp),
      status = 'handled',
      metadata = metadata || jsonb_build_object('handledStatus', NEW.status)
    WHERE recipient_role = 'admin'
      AND type = 'listing_pending_review'
      AND entity_type = 'listing'
      AND entity_id = NEW.id
      AND handled_at IS NULL;
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW.deleted_at IS NOT NULL
    AND OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
  THEN
    UPDATE public.notifications
    SET
      handled_at = COALESCE(handled_at, handled_timestamp),
      status = 'dismissed',
      metadata = metadata || jsonb_build_object('handledStatus', 'deleted')
    WHERE entity_type = 'listing'
      AND entity_id = NEW.id
      AND status = 'active';
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW.status IN ('active', 'approved')
    AND NEW.approved_at IS NOT NULL
    AND (OLD.status = 'pending' OR OLD.approved_at IS NULL)
  THEN
    PERFORM public.upsert_notification(
      NEW.created_by,
      'broker',
      'listing_approved',
      'Listing ''' || NEW.title || '''',
      'has been approved.',
      NULL,
      'listing',
      NEW.id,
      '/dashboard/listings/' || NEW.id::TEXT,
      'normal',
      jsonb_build_object('listingId', NEW.id, 'listingTitle', NEW.title),
      NEW.approved_at
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_listing_lifecycle ON public.listings;
CREATE TRIGGER trg_notify_listing_lifecycle
AFTER INSERT OR UPDATE OF status, approved_at, deleted_at ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.notify_listing_lifecycle();

CREATE OR REPLACE FUNCTION public.dismiss_deleted_entity_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET
    handled_at = COALESCE(handled_at, CURRENT_TIMESTAMP),
    status = 'dismissed',
    metadata = metadata || jsonb_build_object('handledStatus', 'deleted')
  WHERE entity_type = TG_ARGV[0]
    AND entity_id = OLD.id
    AND status = 'active';

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_dismiss_deleted_listing_notifications ON public.listings;
CREATE TRIGGER trg_dismiss_deleted_listing_notifications
AFTER DELETE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.dismiss_deleted_entity_notifications('listing');

DROP TRIGGER IF EXISTS trg_dismiss_deleted_broker_notifications ON public.users;
CREATE TRIGGER trg_dismiss_deleted_broker_notifications
AFTER DELETE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.dismiss_deleted_entity_notifications('broker');

CREATE OR REPLACE FUNCTION public.notify_public_enquiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  listing_title TEXT;
BEGIN
  IF NEW.lead_type <> 'listing_enquiry' THEN
    RETURN NEW;
  END IF;

  SELECT title INTO listing_title FROM public.listings WHERE id = NEW.listing_id;

  PERFORM public.upsert_notification(
    NEW.to_user_id,
    'broker',
    'public_enquiry_received',
    'New enquiry from ' || COALESCE(NULLIF(NEW.contact_name, ''), 'Public visitor'),
    CASE WHEN listing_title IS NULL THEN 'for your listing.' ELSE 'for ' || listing_title || '.' END,
    NEW.from_user_id,
    'lead',
    NEW.id,
    '/dashboard/enquiries',
    'normal',
    jsonb_build_object(
      'leadId', NEW.id,
      'listingId', NEW.listing_id,
      'listingTitle', listing_title,
      'contactName', NEW.contact_name
    ),
    NEW.created_at
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_public_enquiry ON public.leads;
CREATE TRIGGER trg_notify_public_enquiry
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_public_enquiry();

CREATE OR REPLACE FUNCTION public.notify_requirement_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_user_id UUID;
  actor_user_id UUID;
  requirement_title TEXT;
  actor_name TEXT;
BEGIN
  SELECT recipient.user_id, requirement.title
  INTO recipient_user_id, requirement_title
  FROM public.requirements AS requirement
  JOIN public.broker_profiles AS recipient ON recipient.id = requirement.broker_id
  WHERE requirement.id = NEW.requirement_id;

  SELECT actor.user_id INTO actor_user_id
  FROM public.broker_profiles AS actor
  WHERE actor.id = NEW.sender_broker_id;

  IF recipient_user_id IS NULL OR recipient_user_id = actor_user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(TRIM(CONCAT(first_name, ' ', last_name)), ''), 'Broker')
  INTO actor_name
  FROM public.users
  WHERE id = actor_user_id;

  PERFORM public.upsert_notification(
    recipient_user_id,
    'broker',
    'requirement_match_found',
    'Requirement match from ' || COALESCE(actor_name, 'Broker'),
    'for ' || COALESCE(requirement_title, 'your requirement') || '.',
    actor_user_id,
    'requirement_match',
    NEW.id,
    '/dashboard/requirements',
    'normal',
    jsonb_build_object(
      'requirementId', NEW.requirement_id,
      'requirementMatchId', NEW.id,
      'listingId', NEW.listing_id,
      'requirementTitle', requirement_title
    ),
    NEW.created_at
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_requirement_matches_notification ON public.requirement_matches;
DROP TRIGGER IF EXISTS trg_notify_requirement_match ON public.requirement_matches;
CREATE TRIGGER trg_notify_requirement_match
AFTER INSERT ON public.requirement_matches
FOR EACH ROW
EXECUTE FUNCTION public.notify_requirement_match();

CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_record RECORD;
  listing_title TEXT;
  sender_name TEXT;
BEGIN
  IF NEW.receiver_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT conversation.id, conversation.listing_id
  INTO conversation_record
  FROM public.chat_conversations AS conversation
  WHERE conversation.id = NEW.conversation_id;

  SELECT title INTO listing_title FROM public.listings WHERE id = conversation_record.listing_id;
  SELECT COALESCE(NULLIF(TRIM(CONCAT(first_name, ' ', last_name)), ''), 'Broker')
  INTO sender_name
  FROM public.users
  WHERE id = NEW.sender_id;

  PERFORM public.upsert_notification(
    NEW.receiver_id,
    'broker',
    'chat_message_received',
    'New message from ' || COALESCE(sender_name, 'Broker'),
    'Regarding ' || COALESCE(listing_title, 'a listing') || '.',
    NEW.sender_id,
    'conversation',
    NEW.conversation_id,
    '/dashboard/chats/' || NEW.conversation_id::TEXT,
    'normal',
    jsonb_build_object(
      'conversationId', NEW.conversation_id,
      'listingId', conversation_record.listing_id,
      'listingTitle', listing_title,
      'lastMessageSequence', NEW.message_sequence,
      'unreadCount', 1
    ),
    NEW.created_at
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_chat_message ON public.chat_conversation_messages;
CREATE TRIGGER trg_notify_chat_message
AFTER INSERT ON public.chat_conversation_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_chat_message();

CREATE OR REPLACE FUNCTION public.sync_notification_read_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  read_timestamp TIMESTAMPTZ := CURRENT_TIMESTAMP;
BEGIN
  IF TG_TABLE_NAME = 'leads' AND NEW.is_read = TRUE AND OLD.is_read IS DISTINCT FROM NEW.is_read THEN
    UPDATE public.notifications
    SET is_read = TRUE, read_at = COALESCE(NEW.read_at, read_timestamp)
    WHERE recipient_user_id = NEW.to_user_id
      AND type = 'public_enquiry_received'
      AND entity_type = 'lead'
      AND entity_id = NEW.id;
  ELSIF TG_TABLE_NAME = 'listings'
    AND NEW.approval_notification_read_at IS NOT NULL
    AND OLD.approval_notification_read_at IS DISTINCT FROM NEW.approval_notification_read_at
  THEN
    UPDATE public.notifications
    SET is_read = TRUE, read_at = NEW.approval_notification_read_at
    WHERE recipient_user_id = NEW.created_by
      AND type = 'listing_approved'
      AND entity_type = 'listing'
      AND entity_id = NEW.id;
  ELSIF TG_TABLE_NAME = 'chat_conversations' THEN
    IF NEW.owner_last_read_sequence IS DISTINCT FROM OLD.owner_last_read_sequence
      AND COALESCE(NEW.owner_last_read_sequence, 0) >= COALESCE(NEW.last_message_sequence, 0)
    THEN
      UPDATE public.notifications
      SET
        is_read = TRUE,
        read_at = COALESCE(NEW.owner_last_read_at, read_timestamp),
        handled_at = COALESCE(handled_at, COALESCE(NEW.owner_last_read_at, read_timestamp)),
        status = 'dismissed'
      WHERE recipient_user_id = NEW.owner_user_id
        AND type = 'chat_message_received'
        AND entity_type = 'conversation'
        AND entity_id = NEW.id;
    END IF;

    IF NEW.broker_last_read_sequence IS DISTINCT FROM OLD.broker_last_read_sequence
      AND COALESCE(NEW.broker_last_read_sequence, 0) >= COALESCE(NEW.last_message_sequence, 0)
    THEN
      UPDATE public.notifications
      SET
        is_read = TRUE,
        read_at = COALESCE(NEW.broker_last_read_at, read_timestamp),
        handled_at = COALESCE(handled_at, COALESCE(NEW.broker_last_read_at, read_timestamp)),
        status = 'dismissed'
      WHERE recipient_user_id = NEW.broker_user_id
        AND type = 'chat_message_received'
        AND entity_type = 'conversation'
        AND entity_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lead_notification_read ON public.leads;
CREATE TRIGGER trg_sync_lead_notification_read
AFTER UPDATE OF is_read, read_at ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.sync_notification_read_state();

DROP TRIGGER IF EXISTS trg_sync_listing_notification_read ON public.listings;
CREATE TRIGGER trg_sync_listing_notification_read
AFTER UPDATE OF approval_notification_read_at ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.sync_notification_read_state();

DROP TRIGGER IF EXISTS trg_sync_chat_notification_read ON public.chat_conversations;
CREATE TRIGGER trg_sync_chat_notification_read
AFTER UPDATE OF owner_last_read_sequence, broker_last_read_sequence ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.sync_notification_read_state();

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_broker_dashboard_metrics(
  p_user_id UUID,
  p_broker_profile_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_listings BIGINT,
  active_listings BIGINT,
  pending_listings BIGINT,
  public_enquiries BIGINT,
  active_chats BIGINT,
  total_requirements BIGINT,
  active_requirements BIGINT,
  incoming_requirement_matches BIGINT,
  unread_requirement_notifications BIGINT,
  listings_this_week BIGINT,
  pending_listings_this_week BIGINT,
  attention_listings BIGINT,
  new_enquiries BIGINT,
  enquiries_this_week BIGINT,
  chats_this_week BIGINT,
  requirements_this_week BIGINT,
  closed_requirements BIGINT,
  inactive_requirements BIGINT,
  contacted_requirement_matches BIGINT,
  listings_with_chats BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH input AS (
    SELECT CURRENT_TIMESTAMP - INTERVAL '7 days' AS week_start
  ),
  listing_counts AS (
    SELECT
      COUNT(*) AS total_listings,
      COUNT(*) FILTER (WHERE listing.status IN ('active', 'approved')) AS active_listings,
      COUNT(*) FILTER (WHERE listing.status = 'pending') AS pending_listings,
      COUNT(*) FILTER (WHERE listing.status IN ('rejected', 'inactive', 'expired')) AS attention_listings,
      COUNT(*) FILTER (WHERE listing.updated_at >= input.week_start) AS listings_this_week,
      COUNT(*) FILTER (WHERE listing.status = 'pending' AND listing.updated_at >= input.week_start) AS pending_listings_this_week
    FROM public.listings AS listing
    CROSS JOIN input
    WHERE listing.created_by = p_user_id
      AND listing.deleted_at IS NULL
  ),
  lead_counts AS (
    SELECT
      COUNT(*) AS public_enquiries,
      COUNT(*) FILTER (WHERE lead.lead_status = 'new') AS new_enquiries,
      COUNT(*) FILTER (WHERE lead.created_at >= input.week_start) AS enquiries_this_week
    FROM public.leads AS lead
    CROSS JOIN input
    WHERE lead.to_user_id = p_user_id
  ),
  chat_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE conversation.last_message_id IS NOT NULL) AS active_chats,
      COUNT(*) FILTER (WHERE conversation.last_message_at >= input.week_start) AS chats_this_week
    FROM public.chat_conversations AS conversation
    CROSS JOIN input
    WHERE conversation.owner_user_id = p_user_id
      OR conversation.broker_user_id = p_user_id
  ),
  requirement_counts AS (
    SELECT
      COUNT(*) AS total_requirements,
      COUNT(*) FILTER (WHERE requirement.is_active = TRUE) AS active_requirements,
      COUNT(*) FILTER (WHERE requirement.created_at >= input.week_start) AS requirements_this_week,
      COUNT(*) FILTER (WHERE requirement.deleted_at IS NOT NULL) AS closed_requirements,
      COUNT(*) FILTER (WHERE requirement.is_active = FALSE AND requirement.deleted_at IS NULL) AS inactive_requirements
    FROM public.requirements AS requirement
    CROSS JOIN input
    WHERE p_broker_profile_id IS NOT NULL
      AND requirement.broker_id = p_broker_profile_id
  ),
  requirement_match_counts AS (
    SELECT
      COUNT(*) AS incoming_requirement_matches,
      COUNT(*) FILTER (WHERE requirement_match.status = 'contacted') AS contacted_requirement_matches
    FROM public.requirement_matches AS requirement_match
    JOIN public.requirements AS requirement
      ON requirement.id = requirement_match.requirement_id
    WHERE p_broker_profile_id IS NOT NULL
      AND requirement.broker_id = p_broker_profile_id
  ),
  notification_counts AS (
    SELECT COUNT(*) AS unread_requirement_notifications
    FROM public.notifications AS notification
    WHERE notification.recipient_user_id = p_user_id
      AND notification.recipient_role = 'broker'
      AND notification.type = 'requirement_match_found'
      AND notification.status = 'active'
      AND notification.is_read = FALSE
  )
  SELECT
    COALESCE(listing_counts.total_listings, 0),
    COALESCE(listing_counts.active_listings, 0),
    COALESCE(listing_counts.pending_listings, 0),
    COALESCE(lead_counts.public_enquiries, 0),
    COALESCE(chat_counts.active_chats, 0),
    COALESCE(requirement_counts.total_requirements, 0),
    COALESCE(requirement_counts.active_requirements, 0),
    COALESCE(requirement_match_counts.incoming_requirement_matches, 0),
    COALESCE(notification_counts.unread_requirement_notifications, 0),
    COALESCE(listing_counts.listings_this_week, 0),
    COALESCE(listing_counts.pending_listings_this_week, 0),
    COALESCE(listing_counts.attention_listings, 0),
    COALESCE(lead_counts.new_enquiries, 0),
    COALESCE(lead_counts.enquiries_this_week, 0),
    COALESCE(chat_counts.chats_this_week, 0),
    COALESCE(requirement_counts.requirements_this_week, 0),
    COALESCE(requirement_counts.closed_requirements, 0),
    COALESCE(requirement_counts.inactive_requirements, 0),
    COALESCE(requirement_match_counts.contacted_requirement_matches, 0),
    COALESCE(chat_counts.active_chats, 0)
  FROM listing_counts, lead_counts, chat_counts, requirement_counts, requirement_match_counts, notification_counts;
$$;


DROP TABLE IF EXISTS admin_priority_queue_notifications CASCADE;
DROP TABLE IF EXISTS broker_notifications CASCADE;