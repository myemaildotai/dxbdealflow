-- Migration: 049_email_queue.sql
-- Goal: Create email_queue table and batch claiming RPC

CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT,
  text_body TEXT,
  reply_to TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  locked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT email_queue_status_check CHECK (status IN ('pending', 'processing', 'sent', 'failed'))
);

-- Add indexes for status, created_at, and locked_at
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON public.email_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_locked_at ON public.email_queue(locked_at);

-- Enable RLS and block direct client access
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_queue_no_direct_access ON public.email_queue;
CREATE POLICY email_queue_no_direct_access ON public.email_queue
FOR ALL
TO anon, authenticated
USING (FALSE)
WITH CHECK (FALSE);

-- Trigger to keep updated_at synced
CREATE OR REPLACE FUNCTION public.set_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_queue_updated_at ON public.email_queue;
CREATE TRIGGER trg_email_queue_updated_at
  BEFORE UPDATE ON public.email_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.set_email_queue_updated_at();

-- RPC function to atomically claim pending emails using FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_email_queue_batch(
  batch_size INTEGER,
  lock_duration_interval INTERVAL DEFAULT INTERVAL '5 minutes'
)
RETURNS TABLE (
  id UUID,
  to_email TEXT,
  subject TEXT,
  html_body TEXT,
  text_body TEXT,
  reply_to TEXT,
  metadata JSONB,
  status TEXT,
  attempts INTEGER,
  max_attempts INTEGER,
  last_error TEXT,
  locked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH target_emails AS (
    SELECT eq.id
    FROM public.email_queue eq
    WHERE eq.status = 'pending'
       OR (eq.status = 'processing' AND eq.locked_at < NOW() - lock_duration_interval)
    ORDER BY eq.created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.email_queue eq
  SET status = 'processing',
      locked_at = NOW(),
      attempts = eq.attempts + 1,
      updated_at = NOW()
  FROM target_emails
  WHERE eq.id = target_emails.id
  RETURNING
    eq.id,
    eq.to_email,
    eq.subject,
    eq.html_body,
    eq.text_body,
    eq.reply_to,
    eq.metadata,
    eq.status,
    eq.attempts,
    eq.max_attempts,
    eq.last_error,
    eq.locked_at,
    eq.created_at,
    eq.updated_at;
END;
$$;
