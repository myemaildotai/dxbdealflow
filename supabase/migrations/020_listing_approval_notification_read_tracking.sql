ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS approval_notification_read_at TIMESTAMP WITH TIME ZONE;

UPDATE listings
SET approval_notification_read_at = COALESCE(approval_notification_read_at, approved_at)
WHERE approved_at IS NOT NULL
  AND approval_notification_read_at IS NULL;
