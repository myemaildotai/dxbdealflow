ALTER TABLE public.requirement_matches
ADD COLUMN IF NOT EXISTS receiver_broker_id UUID REFERENCES public.broker_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.requirement_matches
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';

UPDATE public.requirement_matches AS rm
SET receiver_broker_id = r.broker_id
FROM public.requirements AS r
WHERE r.id = rm.requirement_id
  AND rm.receiver_broker_id IS NULL;

ALTER TABLE public.requirement_matches
DROP CONSTRAINT IF EXISTS requirement_matches_status_check;

ALTER TABLE public.requirement_matches
ADD CONSTRAINT requirement_matches_status_check
CHECK (status IN ('new', 'read', 'contacted', 'archived'));

CREATE INDEX IF NOT EXISTS idx_requirement_matches_receiver_broker_id ON public.requirement_matches(receiver_broker_id);
CREATE INDEX IF NOT EXISTS idx_requirement_matches_status ON public.requirement_matches(status);
