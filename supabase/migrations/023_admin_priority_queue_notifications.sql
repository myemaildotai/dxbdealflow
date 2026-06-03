CREATE TABLE IF NOT EXISTS admin_priority_queue_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('broker', 'listing')),
  target_id UUID NOT NULL,
  sentence TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  source_created_at TIMESTAMP WITH TIME ZONE,
  handled_status TEXT,
  handled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (admin_user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_priority_queue_notifications_admin_user_id
  ON admin_priority_queue_notifications(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_priority_queue_notifications_target
  ON admin_priority_queue_notifications(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_priority_queue_notifications_created_at
  ON admin_priority_queue_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_priority_queue_notifications_is_read
  ON admin_priority_queue_notifications(is_read);

CREATE OR REPLACE FUNCTION set_admin_priority_queue_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_priority_queue_notifications_updated_at ON admin_priority_queue_notifications;

CREATE TRIGGER trg_admin_priority_queue_notifications_updated_at
BEFORE UPDATE ON admin_priority_queue_notifications
FOR EACH ROW
EXECUTE FUNCTION set_admin_priority_queue_notifications_updated_at();

ALTER TABLE admin_priority_queue_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_priority_queue_notifications_select_own ON admin_priority_queue_notifications;
DROP POLICY IF EXISTS admin_priority_queue_notifications_insert_own ON admin_priority_queue_notifications;
DROP POLICY IF EXISTS admin_priority_queue_notifications_update_own ON admin_priority_queue_notifications;

CREATE POLICY admin_priority_queue_notifications_select_own ON admin_priority_queue_notifications
FOR SELECT USING (
  public.is_admin_user()
  AND auth.uid() = admin_user_id
);

CREATE POLICY admin_priority_queue_notifications_insert_own ON admin_priority_queue_notifications
FOR INSERT WITH CHECK (
  public.is_admin_user()
  AND auth.uid() = admin_user_id
);

CREATE POLICY admin_priority_queue_notifications_update_own ON admin_priority_queue_notifications
FOR UPDATE USING (
  public.is_admin_user()
  AND auth.uid() = admin_user_id
)
WITH CHECK (
  public.is_admin_user()
  AND auth.uid() = admin_user_id
);
