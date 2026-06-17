CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_listings_browse_created
  ON public.listings (created_at DESC, id)
  WHERE deleted_at IS NULL
    AND is_visible = TRUE
    AND status IN ('active', 'approved');

CREATE INDEX IF NOT EXISTS idx_listings_browse_price
  ON public.listings (price ASC, created_at DESC, id)
  WHERE deleted_at IS NULL
    AND is_visible = TRUE
    AND status IN ('active', 'approved');

CREATE INDEX IF NOT EXISTS idx_listings_browse_roi
  ON public.listings (yield_percent DESC NULLS LAST, created_at DESC, id)
  WHERE deleted_at IS NULL
    AND is_visible = TRUE
    AND status IN ('active', 'approved');

CREATE INDEX IF NOT EXISTS idx_listings_browse_area
  ON public.listings (area_id, created_at DESC, id)
  WHERE deleted_at IS NULL
    AND is_visible = TRUE
    AND status IN ('active', 'approved');

CREATE INDEX IF NOT EXISTS idx_listings_browse_property_type
  ON public.listings (property_type, created_at DESC, id)
  WHERE deleted_at IS NULL
    AND is_visible = TRUE
    AND status IN ('active', 'approved');

CREATE INDEX IF NOT EXISTS idx_listings_browse_bedrooms
  ON public.listings (bedrooms, created_at DESC, id)
  WHERE deleted_at IS NULL
    AND is_visible = TRUE
    AND status IN ('active', 'approved');

CREATE INDEX IF NOT EXISTS idx_listings_browse_deal_type
  ON public.listings (deal_type, created_at DESC, id)
  WHERE deleted_at IS NULL
    AND is_visible = TRUE
    AND status IN ('active', 'approved');

CREATE INDEX IF NOT EXISTS idx_listings_browse_updated
  ON public.listings (updated_at DESC, id)
  WHERE deleted_at IS NULL
    AND is_visible = TRUE
    AND status IN ('active', 'approved');

CREATE INDEX IF NOT EXISTS idx_listings_browse_developer
  ON public.listings (developer, created_at DESC, id)
  WHERE deleted_at IS NULL
    AND is_visible = TRUE
    AND status IN ('active', 'approved');

CREATE INDEX IF NOT EXISTS idx_listings_browse_title_trgm
  ON public.listings USING gin (title gin_trgm_ops)
  WHERE deleted_at IS NULL
    AND is_visible = TRUE
    AND status IN ('active', 'approved');

CREATE INDEX IF NOT EXISTS idx_listings_browse_developer_trgm
  ON public.listings USING gin (developer gin_trgm_ops)
  WHERE deleted_at IS NULL
    AND is_visible = TRUE
    AND status IN ('active', 'approved');

CREATE INDEX IF NOT EXISTS idx_listings_browse_description_trgm
  ON public.listings USING gin (description gin_trgm_ops)
  WHERE deleted_at IS NULL
    AND is_visible = TRUE
    AND status IN ('active', 'approved');

CREATE INDEX IF NOT EXISTS idx_listings_browse_notes_trgm
  ON public.listings USING gin (notes gin_trgm_ops)
  WHERE deleted_at IS NULL
    AND is_visible = TRUE
    AND status IN ('active', 'approved');

CREATE INDEX IF NOT EXISTS idx_listings_browse_payment_plan_trgm
  ON public.listings USING gin (payment_plan gin_trgm_ops)
  WHERE deleted_at IS NULL
    AND is_visible = TRUE
    AND status IN ('active', 'approved');

CREATE OR REPLACE FUNCTION public.get_listing_browse_counts(
  p_added_after TIMESTAMPTZ,
  p_area_id UUID,
  p_bedrooms TEXT,
  p_deal_type TEXT,
  p_developer TEXT,
  p_max_price NUMERIC,
  p_min_price NUMERIC,
  p_min_roi NUMERIC,
  p_property_type TEXT,
  p_search TEXT,
  p_search_area_ids UUID[]
)
RETURNS TABLE (
  filtered_count BIGINT,
  new_deals_count BIGINT,
  urgent_sellers_count BIGINT,
  recent_price_drop_count BIGINT,
  off_market_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      listing.created_at,
      listing.deal_type,
      listing.updated_at,
      (
        listing.deal_type = 'urgent_sale'
        OR listing.title ILIKE ANY (ARRAY[
          '%urgent%', '%motivated%', '%must sell%', '%seller needs%',
          '%quick sale%', '%cashflow%', '%cash flow%', '%vacant on transfer%'
        ])
        OR listing.notes ILIKE ANY (ARRAY[
          '%urgent%', '%motivated%', '%must sell%', '%seller needs%',
          '%quick sale%', '%cashflow%', '%cash flow%', '%vacant on transfer%'
        ])
        OR listing.description ILIKE ANY (ARRAY[
          '%urgent%', '%motivated%', '%must sell%', '%seller needs%',
          '%quick sale%', '%cashflow%', '%cash flow%', '%vacant on transfer%'
        ])
        OR listing.payment_plan ILIKE ANY (ARRAY[
          '%urgent%', '%motivated%', '%must sell%', '%seller needs%',
          '%quick sale%', '%cashflow%', '%cash flow%', '%vacant on transfer%'
        ])
      ) AS is_urgent_seller,
      (
        listing.updated_at >= NOW() - INTERVAL '21 days'
        AND (
          listing.title ILIKE ANY (ARRAY[
            '%price drop%', '%price cut%', '%price reduced%', '%reduced%',
            '%discount%', '%discounted%', '%below ask%', '%cut price%', '%cheaper%'
          ])
          OR listing.notes ILIKE ANY (ARRAY[
            '%price drop%', '%price cut%', '%price reduced%', '%reduced%',
            '%discount%', '%discounted%', '%below ask%', '%cut price%', '%cheaper%'
          ])
          OR listing.description ILIKE ANY (ARRAY[
            '%price drop%', '%price cut%', '%price reduced%', '%reduced%',
            '%discount%', '%discounted%', '%below ask%', '%cut price%', '%cheaper%'
          ])
          OR listing.payment_plan ILIKE ANY (ARRAY[
            '%price drop%', '%price cut%', '%price reduced%', '%reduced%',
            '%discount%', '%discounted%', '%below ask%', '%cut price%', '%cheaper%'
          ])
        )
      ) AS is_recent_price_drop
    FROM public.listings AS listing
    WHERE listing.deleted_at IS NULL
      AND listing.is_visible = TRUE
      AND listing.status IN ('active', 'approved')
      AND (p_area_id IS NULL OR listing.area_id = p_area_id)
      AND (p_property_type IS NULL OR listing.property_type = p_property_type)
      AND (p_min_price IS NULL OR listing.price >= p_min_price)
      AND (p_max_price IS NULL OR listing.price <= p_max_price)
      AND (
        p_search IS NULL
        OR listing.title ILIKE '%' || p_search || '%'
        OR listing.developer ILIKE '%' || p_search || '%'
        OR listing.description ILIKE '%' || p_search || '%'
        OR listing.notes ILIKE '%' || p_search || '%'
        OR listing.area_id = ANY (COALESCE(p_search_area_ids, ARRAY[]::UUID[]))
      )
      AND (
        p_bedrooms IS NULL
        OR (p_bedrooms = '0' AND listing.bedrooms = 0)
        OR (p_bedrooms = '4+' AND listing.bedrooms >= 4)
        OR (p_bedrooms = '8+' AND listing.bedrooms >= 8)
        OR CASE
          WHEN p_bedrooms ~ '^[0-9]+$' THEN listing.bedrooms = p_bedrooms::INTEGER
          ELSE FALSE
        END
      )
      AND (p_developer IS NULL OR listing.developer = p_developer)
      AND (p_min_roi IS NULL OR listing.yield_percent >= p_min_roi)
      AND (p_added_after IS NULL OR listing.created_at >= p_added_after)
  ),
  filtered AS (
    SELECT base.*
    FROM base
    WHERE p_deal_type IS NULL
      OR (p_deal_type = 'urgent' AND base.is_urgent_seller)
      OR (p_deal_type = 'distressed' AND base.deal_type = 'distressed')
      OR (p_deal_type = 'off-market' AND base.deal_type = 'secondary')
  )
  SELECT
    COUNT(*) AS filtered_count,
    COUNT(*) FILTER (WHERE filtered.created_at >= NOW() - INTERVAL '1 day') AS new_deals_count,
    COUNT(*) FILTER (WHERE filtered.is_urgent_seller) AS urgent_sellers_count,
    COUNT(*) FILTER (WHERE filtered.is_recent_price_drop) AS recent_price_drop_count,
    COUNT(*) FILTER (WHERE filtered.deal_type = 'secondary') AS off_market_count
  FROM filtered;
$$;

REVOKE ALL ON FUNCTION public.get_listing_browse_counts(
  TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, UUID[]
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_listing_browse_counts(
  TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, UUID[]
) TO service_role;
