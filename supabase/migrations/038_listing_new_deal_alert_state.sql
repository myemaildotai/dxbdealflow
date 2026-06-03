ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS last_new_deal_alert_sent_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_listings_last_new_deal_alert_sent_at
  ON public.listings(last_new_deal_alert_sent_at);
