ALTER TABLE public.broker_profiles
ADD COLUMN IF NOT EXISTS instagram_profile TEXT,
ADD COLUMN IF NOT EXISTS linkedin_profile TEXT;
