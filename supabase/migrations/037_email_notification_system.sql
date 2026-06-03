CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  provider_message_id TEXT,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT email_logs_email_type_check CHECK (
    email_type IN (
      'welcome_early_interest',
      'broker_verification_success',
      'manual_review_pending',
      'listing_submitted',
      'listing_approved',
      'new_deal_alert',
      'new_message_received',
      'requirement_match_found',
      'weekly_deal_digest',
      'profile_completion_reminder',
      'broker_email_verification_otp',
      'broker_public_enquiry_notification',
      'enquiry_reply_email'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_email_logs_type_created_at
  ON public.email_logs(email_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_user_created_at
  ON public.email_logs(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_related_entity
  ON public.email_logs(related_entity_type, related_entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_status_created_at
  ON public.email_logs(status, created_at DESC);

DROP TABLE IF EXISTS public.email_preferences CASCADE;

CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  email_log_id UUID REFERENCES public.email_logs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_events_email_type_check CHECK (
    email_type IN (
      'welcome_early_interest',
      'broker_verification_success',
      'manual_review_pending',
      'listing_submitted',
      'listing_approved',
      'new_deal_alert',
      'new_message_received',
      'requirement_match_found',
      'weekly_deal_digest',
      'profile_completion_reminder',
      'broker_email_verification_otp',
      'broker_public_enquiry_notification',
      'enquiry_reply_email'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_email_events_type_created_at
  ON public.email_events(email_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_events_recipient_user_created_at
  ON public.email_events(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_events_related_entity
  ON public.email_events(related_entity_type, related_entity_id, created_at DESC);

ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_email_type_check;

ALTER TABLE public.email_logs
  ADD CONSTRAINT email_logs_email_type_check CHECK (
    email_type IN (
      'welcome_early_interest',
      'broker_verification_success',
      'manual_review_pending',
      'listing_submitted',
      'listing_approved',
      'new_deal_alert',
      'new_message_received',
      'requirement_match_found',
      'weekly_deal_digest',
      'profile_completion_reminder',
      'broker_email_verification_otp',
      'broker_public_enquiry_notification',
      'enquiry_reply_email'
    )
  ) NOT VALID;

ALTER TABLE public.email_events
  DROP CONSTRAINT IF EXISTS email_events_email_type_check;

ALTER TABLE public.email_events
  ADD CONSTRAINT email_events_email_type_check CHECK (
    email_type IN (
      'welcome_early_interest',
      'broker_verification_success',
      'manual_review_pending',
      'listing_submitted',
      'listing_approved',
      'new_deal_alert',
      'new_message_received',
      'requirement_match_found',
      'weekly_deal_digest',
      'profile_completion_reminder',
      'broker_email_verification_otp',
      'broker_public_enquiry_notification',
      'enquiry_reply_email'
    )
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.set_email_tracking_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_events_updated_at ON public.email_events;

CREATE TRIGGER trg_email_events_updated_at
BEFORE UPDATE ON public.email_events
FOR EACH ROW
EXECUTE FUNCTION public.set_email_tracking_updated_at();

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_logs_no_direct_access ON public.email_logs;
DROP POLICY IF EXISTS email_events_no_direct_access ON public.email_events;

CREATE POLICY email_logs_no_direct_access ON public.email_logs
FOR ALL USING (FALSE)
WITH CHECK (FALSE);

CREATE POLICY email_events_no_direct_access ON public.email_events
FOR ALL USING (FALSE)
WITH CHECK (FALSE);
