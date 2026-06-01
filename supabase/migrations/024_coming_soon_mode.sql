CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.coming_soon_role_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.coming_soon_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  instagram_handle TEXT,
  company_agency_name TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES public.coming_soon_role_options(id) ON DELETE RESTRICT,
  role_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION public.set_coming_soon_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coming_soon_role_options_updated_at ON public.coming_soon_role_options;
CREATE TRIGGER trg_coming_soon_role_options_updated_at
BEFORE UPDATE ON public.coming_soon_role_options
FOR EACH ROW
EXECUTE FUNCTION public.set_coming_soon_updated_at();

DROP TRIGGER IF EXISTS trg_coming_soon_registrations_updated_at ON public.coming_soon_registrations;
CREATE TRIGGER trg_coming_soon_registrations_updated_at
BEFORE UPDATE ON public.coming_soon_registrations
FOR EACH ROW
EXECUTE FUNCTION public.set_coming_soon_updated_at();

CREATE INDEX IF NOT EXISTS idx_coming_soon_role_options_active_order
  ON public.coming_soon_role_options(is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_coming_soon_registrations_created_at
  ON public.coming_soon_registrations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coming_soon_registrations_role_id
  ON public.coming_soon_registrations(role_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coming_soon_registrations_email_unique
  ON public.coming_soon_registrations(LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_coming_soon_registrations_whatsapp_unique
  ON public.coming_soon_registrations(whatsapp_number);

INSERT INTO public.settings (key, value)
VALUES ('coming_soon_mode', '{"enabled": false}'::JSONB)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.coming_soon_role_options (name, display_order, is_active)
VALUES
  ('Licensed Real Estate Broker', 10, TRUE),
  ('Senior Broker / Team Leader', 20, TRUE),
  ('Agency Owner / Director', 30, TRUE),
  ('Property Investor (Direct Buyer)', 40, TRUE),
  ('Family Office / UHNW Investor', 50, TRUE),
  (U&'Investment Advisor / Buyer\2019s Rep', 60, TRUE),
  ('Developer Sales Representative', 70, TRUE),
  ('Property Consultant (Non-RERA)', 80, TRUE),
  ('Mortgage Broker / Finance Advisor', 90, TRUE),
  ('Conveyancer / Legal Advisor', 100, TRUE),
  ('Other (Requires Manual Approval)', 110, TRUE)
ON CONFLICT (name) DO UPDATE
SET
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coming_soon_role_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coming_soon_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS settings_select_public_modes ON public.settings;
CREATE POLICY settings_select_public_modes ON public.settings
FOR SELECT
TO anon, authenticated
USING (key IN ('maintenance_mode', 'coming_soon_mode'));

DROP POLICY IF EXISTS settings_admin_manage ON public.settings;
CREATE POLICY settings_admin_manage ON public.settings
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS coming_soon_role_options_select_active ON public.coming_soon_role_options;
CREATE POLICY coming_soon_role_options_select_active ON public.coming_soon_role_options
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

DROP POLICY IF EXISTS coming_soon_role_options_admin_manage ON public.coming_soon_role_options;
CREATE POLICY coming_soon_role_options_admin_manage ON public.coming_soon_role_options
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS coming_soon_registrations_public_insert ON public.coming_soon_registrations;
CREATE POLICY coming_soon_registrations_public_insert ON public.coming_soon_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.coming_soon_role_options role_option
    WHERE role_option.id = public.coming_soon_registrations.role_id
      AND role_option.is_active = TRUE
  )
);

DROP POLICY IF EXISTS coming_soon_registrations_admin_manage ON public.coming_soon_registrations;
CREATE POLICY coming_soon_registrations_admin_manage ON public.coming_soon_registrations
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());
