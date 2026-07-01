-- Migration: 051_schedule_email_queue_cron.sql
-- Goal: Schedule process-email-queue Edge Function using pg_cron & pg_net

-- 1. Safely enable the required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Prevent duplicate cron jobs: unschedule existing job with the same name if it exists
SELECT cron.unschedule('process-email-queue-every-minute')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue-every-minute'
);

-- 3. Schedule the cron job to call the Edge Function every minute
-- Note: In production, the URL is resolved dynamically from vault.decrypted_secrets.
-- In local development (Supabase CLI), it falls back to the Docker network container hostname 'http://kong:8000'.
SELECT cron.schedule(
  'process-email-queue-every-minute', -- Safe job name
  '* * * * *',                        -- Schedule: every minute
  $$
  SELECT net.http_post(
    url := COALESCE(
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1),
      'http://kong:8000'
    ) || '/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key' LIMIT 1),
        'dummy-local-key'
      )
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
