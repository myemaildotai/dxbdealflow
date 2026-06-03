CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE broker_profiles
ADD COLUMN IF NOT EXISTS id UUID;

UPDATE broker_profiles
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE broker_profiles
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE broker_profiles
ALTER COLUMN id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'broker_profiles_id_unique'
  ) THEN
    ALTER TABLE broker_profiles
    ADD CONSTRAINT broker_profiles_id_unique UNIQUE (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_broker_profiles_id ON broker_profiles(id);

ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS broker_id UUID,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS area TEXT,
ADD COLUMN IF NOT EXISTS timeline TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE requirements
ALTER COLUMN title DROP NOT NULL;

DO $$
DECLARE
  bedrooms_type TEXT;
BEGIN
  SELECT data_type
  INTO bedrooms_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'requirements'
    AND column_name = 'bedrooms';

  IF bedrooms_type <> 'text' THEN
    ALTER TABLE requirements
    ALTER COLUMN bedrooms TYPE TEXT
    USING (
      CASE
        WHEN bedrooms IS NULL THEN NULL
        WHEN bedrooms = 0 THEN 'Studio'
        ELSE bedrooms::TEXT || 'BR'
      END
    );
  END IF;
END $$;

ALTER TABLE requirements
ALTER COLUMN budget_min TYPE NUMERIC USING budget_min::NUMERIC,
ALTER COLUMN budget_max TYPE NUMERIC USING budget_max::NUMERIC;

UPDATE requirements
SET deal_type = 'offplan'
WHERE deal_type = 'off_plan';

UPDATE requirements
SET deal_type = 'urgent'
WHERE deal_type = 'urgent_sale';

UPDATE requirements
SET urgency = 'high'
WHERE urgency = 'hot';

UPDATE requirements
SET urgency = 'medium'
WHERE urgency = 'active';

UPDATE requirements
SET urgency = 'low'
WHERE urgency = 'planning';

UPDATE requirements r
SET description = COALESCE(NULLIF(r.description, ''), NULLIF(r.notes, ''), NULLIF(r.title, ''), 'Buyer brief pending');

UPDATE requirements r
SET area = COALESCE(
  NULLIF(r.area, ''),
  (
    SELECT a.name
    FROM areas a
    WHERE a.id = r.area_id
  )
);

UPDATE requirements r
SET broker_id = bp.id
FROM broker_profiles bp
WHERE r.broker_id IS NULL
  AND bp.user_id = r.posted_by;

UPDATE requirements
SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP);

ALTER TABLE requirements
DROP CONSTRAINT IF EXISTS requirements_deal_type_check;

ALTER TABLE requirements
DROP CONSTRAINT IF EXISTS requirements_urgency_check;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'requirements'
      AND column_name = 'description'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE requirements
    ALTER COLUMN description SET NOT NULL;
  END IF;
END $$;

ALTER TABLE requirements
ADD CONSTRAINT requirements_deal_type_check CHECK (deal_type IN ('secondary', 'offplan', 'urgent', 'distressed'));

ALTER TABLE requirements
ADD CONSTRAINT requirements_urgency_check CHECK (urgency IN ('low', 'medium', 'high'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'requirements_broker_id_fkey'
  ) THEN
    ALTER TABLE requirements
    ADD CONSTRAINT requirements_broker_id_fkey
    FOREIGN KEY (broker_id) REFERENCES broker_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM requirements
    WHERE broker_id IS NULL
  ) THEN
    RAISE NOTICE 'requirements.broker_id still contains null values; leaving column nullable until data is repaired.';
  ELSE
    ALTER TABLE requirements
    ALTER COLUMN broker_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_requirements_broker_id ON requirements(broker_id);
CREATE INDEX IF NOT EXISTS idx_requirements_is_active ON requirements(is_active);
CREATE INDEX IF NOT EXISTS idx_requirements_area_text ON requirements(area);
CREATE INDEX IF NOT EXISTS idx_requirements_property_type ON requirements(property_type);
CREATE INDEX IF NOT EXISTS idx_requirements_urgency ON requirements(urgency);

CREATE OR REPLACE FUNCTION set_requirement_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_requirements_updated_at ON requirements;

CREATE TRIGGER trg_requirements_updated_at
BEFORE UPDATE ON requirements
FOR EACH ROW
EXECUTE FUNCTION set_requirement_updated_at();

ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS requirements_select_active_or_owner_or_admin ON requirements;
DROP POLICY IF EXISTS requirements_insert_own_or_admin ON requirements;
DROP POLICY IF EXISTS requirements_update_own_or_admin ON requirements;
DROP POLICY IF EXISTS requirements_delete_own_or_admin ON requirements;

CREATE POLICY requirements_select_active_or_owner_or_admin ON requirements
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = requirements.broker_id
      AND bp.user_id = auth.uid()
  )
  OR (
    requirements.is_active = TRUE
    AND EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'broker'
        AND u.status = 'active'
    )
  )
);

CREATE POLICY requirements_insert_own_or_admin ON requirements
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    JOIN users u ON u.id = bp.user_id
    WHERE bp.id = requirements.broker_id
      AND bp.user_id = auth.uid()
      AND u.role = 'broker'
      AND u.status = 'active'
  )
);

CREATE POLICY requirements_update_own_or_admin ON requirements
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = requirements.broker_id
      AND bp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    JOIN users u ON u.id = bp.user_id
    WHERE bp.id = requirements.broker_id
      AND bp.user_id = auth.uid()
      AND u.role = 'broker'
      AND u.status = 'active'
  )
);

CREATE POLICY requirements_delete_own_or_admin ON requirements
FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = requirements.broker_id
      AND bp.user_id = auth.uid()
  )
);

CREATE TABLE IF NOT EXISTS requirement_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  sender_broker_id UUID NOT NULL REFERENCES broker_profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requirement_matches_requirement_id ON requirement_matches(requirement_id);
CREATE INDEX IF NOT EXISTS idx_requirement_matches_sender_broker_id ON requirement_matches(sender_broker_id);
CREATE INDEX IF NOT EXISTS idx_requirement_matches_created_at ON requirement_matches(created_at DESC);

ALTER TABLE requirement_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS requirement_matches_select_owner_sender_or_admin ON requirement_matches;
DROP POLICY IF EXISTS requirement_matches_insert_sender_or_admin ON requirement_matches;

CREATE POLICY requirement_matches_select_owner_sender_or_admin ON requirement_matches
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = requirement_matches.sender_broker_id
      AND bp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM requirements r
    JOIN broker_profiles bp ON bp.id = r.broker_id
    WHERE r.id = requirement_matches.requirement_id
      AND bp.user_id = auth.uid()
  )
);

CREATE POLICY requirement_matches_insert_sender_or_admin ON requirement_matches
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM broker_profiles sender_bp
    JOIN users sender_user ON sender_user.id = sender_bp.user_id
    JOIN requirements r ON r.id = requirement_matches.requirement_id
    WHERE sender_bp.id = requirement_matches.sender_broker_id
      AND sender_bp.user_id = auth.uid()
      AND sender_user.role = 'broker'
      AND sender_user.status = 'active'
      AND r.is_active = TRUE
      AND r.broker_id <> requirement_matches.sender_broker_id
  )
);

CREATE TABLE IF NOT EXISTS broker_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_broker_id UUID NOT NULL REFERENCES broker_profiles(id) ON DELETE CASCADE,
  actor_broker_id UUID REFERENCES broker_profiles(id) ON DELETE SET NULL,
  requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL,
  requirement_match_id UUID REFERENCES requirement_matches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_broker_notifications_recipient_broker_id ON broker_notifications(recipient_broker_id);
CREATE INDEX IF NOT EXISTS idx_broker_notifications_created_at ON broker_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broker_notifications_is_read ON broker_notifications(is_read);

ALTER TABLE broker_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS broker_notifications_select_own_or_admin ON broker_notifications;
DROP POLICY IF EXISTS broker_notifications_update_own_or_admin ON broker_notifications;

CREATE POLICY broker_notifications_select_own_or_admin ON broker_notifications
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = broker_notifications.recipient_broker_id
      AND bp.user_id = auth.uid()
  )
);

CREATE POLICY broker_notifications_update_own_or_admin ON broker_notifications
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = broker_notifications.recipient_broker_id
      AND bp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = broker_notifications.recipient_broker_id
      AND bp.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION create_requirement_match_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requirement_record requirements%ROWTYPE;
BEGIN
  SELECT *
  INTO requirement_record
  FROM requirements
  WHERE id = NEW.requirement_id;

  IF requirement_record.id IS NULL OR requirement_record.broker_id = NEW.sender_broker_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO broker_notifications (
    recipient_broker_id,
    actor_broker_id,
    requirement_id,
    requirement_match_id,
    title,
    message
  )
  VALUES (
    requirement_record.broker_id,
    NEW.sender_broker_id,
    NEW.requirement_id,
    NEW.id,
    'New buyer requirement match',
    'A broker submitted a match against your buyer requirement.'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_requirement_matches_notification ON requirement_matches;

CREATE TRIGGER trg_requirement_matches_notification
AFTER INSERT ON requirement_matches
FOR EACH ROW
EXECUTE FUNCTION create_requirement_match_notification();
