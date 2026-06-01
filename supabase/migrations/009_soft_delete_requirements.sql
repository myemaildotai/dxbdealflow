ALTER TABLE public.requirements
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_requirements_deleted_at ON public.requirements(deleted_at);

ALTER TABLE public.requirements
DROP CONSTRAINT IF EXISTS requirements_deleted_are_inactive_check;

ALTER TABLE public.requirements
ADD CONSTRAINT requirements_deleted_are_inactive_check CHECK (
  deleted_at IS NULL OR is_active = FALSE
);

CREATE OR REPLACE FUNCTION public.can_update_requirement(
  requirement_id UUID,
  next_broker_id UUID,
  next_is_active BOOLEAN,
  next_deactivated_by public.requirement_deactivated_by,
  next_deleted_at TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_requirement public.requirements%ROWTYPE;
  owns_requirement BOOLEAN;
BEGIN
  IF public.is_admin_user() THEN
    RETURN TRUE;
  END IF;

  IF NOT public.is_active_broker_user() THEN
    RETURN FALSE;
  END IF;

  SELECT *
  INTO current_requirement
  FROM public.requirements
  WHERE id = requirement_id
  LIMIT 1;

  IF current_requirement.id IS NULL OR current_requirement.deleted_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.broker_profiles bp
    WHERE bp.id = current_requirement.broker_id
      AND bp.user_id = auth.uid()
  )
  INTO owns_requirement;

  IF NOT owns_requirement THEN
    RETURN FALSE;
  END IF;

  IF next_broker_id IS DISTINCT FROM current_requirement.broker_id THEN
    RETURN FALSE;
  END IF;

  IF next_deleted_at IS NOT NULL THEN
    RETURN next_is_active = FALSE AND next_deactivated_by = 'broker';
  END IF;

  IF next_is_active = TRUE THEN
    IF next_deactivated_by IS NOT NULL THEN
      RETURN FALSE;
    END IF;

    IF current_requirement.is_active = TRUE THEN
      RETURN TRUE;
    END IF;

    RETURN current_requirement.deactivated_by = 'broker';
  END IF;

  IF next_deactivated_by IS NULL THEN
    RETURN FALSE;
  END IF;

  IF current_requirement.is_active = TRUE THEN
    RETURN next_deactivated_by = 'broker';
  END IF;

  RETURN next_deactivated_by = current_requirement.deactivated_by;
END;
$$;

DROP POLICY IF EXISTS requirements_select_active_or_owner_or_admin ON public.requirements;

CREATE POLICY requirements_select_active_or_owner_or_admin ON public.requirements
FOR SELECT USING (
  public.is_admin_user()
  OR (
    requirements.deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.broker_profiles bp
      WHERE bp.id = requirements.broker_id
        AND bp.user_id = auth.uid()
    )
  )
  OR (
    requirements.deleted_at IS NULL
    AND requirements.is_active = TRUE
    AND public.is_active_broker_user()
  )
);

DROP POLICY IF EXISTS requirements_update_own_or_admin ON public.requirements;

CREATE POLICY requirements_update_own_or_admin ON public.requirements
FOR UPDATE USING (
  public.is_admin_user()
  OR (
    requirements.deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.broker_profiles bp
      WHERE bp.id = requirements.broker_id
        AND bp.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.can_update_requirement(id, broker_id, is_active, deactivated_by, deleted_at)
);

DROP POLICY IF EXISTS requirements_delete_own_or_admin ON public.requirements;
