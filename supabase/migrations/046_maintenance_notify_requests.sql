CREATE TABLE IF NOT EXISTS public.maintenance_notify_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  maintenance_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT maintenance_notify_requests_status_check
    CHECK (status IN ('pending', 'notified'))
);

CREATE UNIQUE INDEX IF NOT EXISTS maintenance_notify_requests_version_email_unique
  ON public.maintenance_notify_requests(maintenance_version, LOWER(email));

CREATE INDEX IF NOT EXISTS idx_maintenance_notify_requests_pending_version
  ON public.maintenance_notify_requests(maintenance_version DESC, created_at ASC)
  WHERE status = 'pending';

ALTER TABLE public.maintenance_notify_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maintenance_notify_requests_no_direct_access ON public.maintenance_notify_requests;

CREATE POLICY maintenance_notify_requests_no_direct_access ON public.maintenance_notify_requests
FOR ALL
TO anon, authenticated
USING (FALSE)
WITH CHECK (FALSE);

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
      'enquiry_reply_email',
      'maintenance_availability'
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
      'enquiry_reply_email',
      'maintenance_availability'
    )
  ) NOT VALID;
