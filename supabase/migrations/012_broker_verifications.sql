CREATE TABLE IF NOT EXISTS broker_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker_number TEXT NOT NULL,
  broker_name TEXT,
  broker_email TEXT,
  broker_phone TEXT,
  office_name TEXT,
  office_number TEXT,
  broker_found BOOLEAN NOT NULL DEFAULT FALSE,
  email_match BOOLEAN NOT NULL DEFAULT FALSE,
  phone_match BOOLEAN NOT NULL DEFAULT FALSE,
  verification_source TEXT NOT NULL DEFAULT 'DLD',
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'auto_approved')),
  raw_payload JSONB,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_broker_verifications_broker_number ON broker_verifications(broker_number);
CREATE INDEX IF NOT EXISTS idx_broker_verifications_status ON broker_verifications(verification_status);

CREATE OR REPLACE FUNCTION set_broker_verifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broker_verifications_updated_at ON broker_verifications;

CREATE TRIGGER trg_broker_verifications_updated_at
BEFORE UPDATE ON broker_verifications
FOR EACH ROW
EXECUTE FUNCTION set_broker_verifications_updated_at();
