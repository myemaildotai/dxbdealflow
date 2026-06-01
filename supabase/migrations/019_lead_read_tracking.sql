ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

UPDATE leads
SET
  is_read = CASE
    WHEN lead_status = 'new' THEN FALSE
    ELSE TRUE
  END,
  read_at = CASE
    WHEN lead_status = 'new' THEN NULL
    ELSE COALESCE(read_at, created_at, CURRENT_TIMESTAMP)
  END
WHERE read_at IS NULL;
