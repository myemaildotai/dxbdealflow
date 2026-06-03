CREATE TABLE IF NOT EXISTS broker_email_verifications (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_broker_email_verifications_verified_at
  ON broker_email_verifications(verified_at);

CREATE TABLE IF NOT EXISTS broker_email_verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_broker_email_verification_otps_user_created_at
  ON broker_email_verification_otps(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_broker_email_verification_otps_active
  ON broker_email_verification_otps(user_id, email, created_at DESC)
  WHERE consumed_at IS NULL;

CREATE OR REPLACE FUNCTION set_broker_email_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_broker_email_verifications_updated_at ON broker_email_verifications;

CREATE TRIGGER trg_broker_email_verifications_updated_at
BEFORE UPDATE ON broker_email_verifications
FOR EACH ROW
EXECUTE FUNCTION set_broker_email_verifications_updated_at();

ALTER TABLE broker_email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_email_verification_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS broker_email_verifications_no_direct_access ON broker_email_verifications;
DROP POLICY IF EXISTS broker_email_verification_otps_no_direct_access ON broker_email_verification_otps;

CREATE POLICY broker_email_verifications_no_direct_access ON broker_email_verifications
FOR ALL USING (FALSE)
WITH CHECK (FALSE);

CREATE POLICY broker_email_verification_otps_no_direct_access ON broker_email_verification_otps
FOR ALL USING (FALSE)
WITH CHECK (FALSE);
