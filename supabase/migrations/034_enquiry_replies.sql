CREATE TABLE IF NOT EXISTS public.enquiry_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  broker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  enquirer_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) <= 180),
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.enquiry_replies
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE public.enquiry_replies
SET status = 'pending'
WHERE status IS NULL;

UPDATE public.enquiry_replies
SET created_at = CURRENT_TIMESTAMP
WHERE created_at IS NULL;

ALTER TABLE public.enquiry_replies
  ALTER COLUMN sent_at DROP NOT NULL,
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.enquiry_replies
  DROP CONSTRAINT IF EXISTS enquiry_replies_status_check;

ALTER TABLE public.enquiry_replies
  ADD CONSTRAINT enquiry_replies_status_check CHECK (status IN ('pending', 'sent', 'failed'));

ALTER TABLE public.enquiry_replies
  DROP CONSTRAINT IF EXISTS enquiry_replies_message_check;

ALTER TABLE public.enquiry_replies
  ADD CONSTRAINT enquiry_replies_message_check CHECK (char_length(message) <= 180);

CREATE INDEX IF NOT EXISTS idx_enquiry_replies_enquiry_sent
  ON public.enquiry_replies (enquiry_id, sent_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_enquiry_replies_broker_sent
  ON public.enquiry_replies (broker_id, sent_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_enquiry_replies_listing_sent
  ON public.enquiry_replies (listing_id, sent_at DESC, id)
  WHERE listing_id IS NOT NULL;

ALTER TABLE public.enquiry_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS enquiry_replies_select_own ON public.enquiry_replies;
DROP POLICY IF EXISTS enquiry_replies_insert_own ON public.enquiry_replies;
DROP POLICY IF EXISTS enquiry_replies_update_own_pending ON public.enquiry_replies;

CREATE POLICY enquiry_replies_select_own ON public.enquiry_replies
  FOR SELECT
  USING (
    public.is_admin_user()
    OR (
      auth.uid() = broker_id
      AND EXISTS (
        SELECT 1
        FROM public.leads
        WHERE leads.id = enquiry_replies.enquiry_id
          AND leads.to_user_id = auth.uid()
      )
    )
  );

CREATE POLICY enquiry_replies_insert_own ON public.enquiry_replies
  FOR INSERT
  WITH CHECK (
    auth.uid() = broker_id
    AND EXISTS (
      SELECT 1
      FROM public.leads
      WHERE leads.id = enquiry_replies.enquiry_id
        AND leads.to_user_id = auth.uid()
        AND (
          enquiry_replies.listing_id IS NULL
          OR enquiry_replies.listing_id = leads.listing_id
        )
    )
  );

CREATE POLICY enquiry_replies_update_own_pending ON public.enquiry_replies
  FOR UPDATE
  USING (
    auth.uid() = broker_id
    AND status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.leads
      WHERE leads.id = enquiry_replies.enquiry_id
        AND leads.to_user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = broker_id
    AND status IN ('sent', 'failed')
    AND EXISTS (
      SELECT 1
      FROM public.leads
      WHERE leads.id = enquiry_replies.enquiry_id
        AND leads.to_user_id = auth.uid()
        AND (
          enquiry_replies.listing_id IS NULL
          OR enquiry_replies.listing_id = leads.listing_id
        )
    )
  );

NOTIFY pgrst, 'reload schema';
