CREATE OR REPLACE FUNCTION sync_requirement_ownership_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.posted_by IS NULL THEN
    NEW.posted_by := auth.uid();
  END IF;

  IF NEW.posted_by IS NULL AND NEW.broker_id IS NOT NULL THEN
    SELECT bp.user_id
    INTO NEW.posted_by
    FROM broker_profiles bp
    WHERE bp.id = NEW.broker_id;
  END IF;

  IF NEW.broker_id IS NULL AND NEW.posted_by IS NOT NULL THEN
    SELECT bp.id
    INTO NEW.broker_id
    FROM broker_profiles bp
    WHERE bp.user_id = NEW.posted_by;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_requirements_sync_ownership ON requirements;

CREATE TRIGGER trg_requirements_sync_ownership
BEFORE INSERT OR UPDATE ON requirements
FOR EACH ROW
EXECUTE FUNCTION sync_requirement_ownership_columns();
