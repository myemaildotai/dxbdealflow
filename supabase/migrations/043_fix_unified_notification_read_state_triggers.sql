DROP TRIGGER IF EXISTS trg_sync_lead_notification_read ON public.leads;
DROP TRIGGER IF EXISTS trg_sync_listing_notification_read ON public.listings;
DROP TRIGGER IF EXISTS trg_sync_chat_notification_read ON public.chat_conversations;

DROP FUNCTION IF EXISTS public.sync_notification_read_state();

CREATE OR REPLACE FUNCTION public.sync_lead_notification_read_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_read = TRUE AND OLD.is_read IS DISTINCT FROM NEW.is_read THEN
    UPDATE public.notifications
    SET
      is_read = TRUE,
      read_at = COALESCE(NEW.read_at, CURRENT_TIMESTAMP)
    WHERE recipient_user_id = NEW.to_user_id
      AND type = 'public_enquiry_received'
      AND (
        (entity_type = 'lead' AND entity_id = NEW.id)
        OR metadata ->> 'leadId' = NEW.id::TEXT
      );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_listing_notification_read_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.approval_notification_read_at IS NULL
    AND NEW.approval_notification_read_at IS NOT NULL
  THEN
    UPDATE public.notifications
    SET
      is_read = TRUE,
      read_at = NEW.approval_notification_read_at
    WHERE recipient_user_id = NEW.created_by
      AND type = 'listing_approved'
      AND (
        (entity_type = 'listing' AND entity_id = NEW.id)
        OR metadata ->> 'listingId' = NEW.id::TEXT
      );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_chat_notification_read_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  read_timestamp TIMESTAMPTZ := CURRENT_TIMESTAMP;
BEGIN
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
      AND (
        (entity_type = 'conversation' AND entity_id = NEW.id)
        OR metadata ->> 'conversationId' = NEW.id::TEXT
      );
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
      AND (
        (entity_type = 'conversation' AND entity_id = NEW.id)
        OR metadata ->> 'conversationId' = NEW.id::TEXT
      );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_lead_notification_read
AFTER UPDATE OF is_read, read_at ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.sync_lead_notification_read_state();

CREATE TRIGGER trg_sync_listing_notification_read
AFTER UPDATE OF approval_notification_read_at ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.sync_listing_notification_read_state();

CREATE TRIGGER trg_sync_chat_notification_read
AFTER UPDATE OF owner_last_read_sequence, broker_last_read_sequence ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.sync_chat_notification_read_state();
