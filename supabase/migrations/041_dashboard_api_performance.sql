CREATE INDEX IF NOT EXISTS idx_leads_to_user_status_created
  ON public.leads (to_user_id, lead_status, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_requirements_broker_active_created
  ON public.requirements (broker_id, is_active, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_requirements_broker_deleted_created
  ON public.requirements (broker_id, deleted_at, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_requirement_matches_requirement_status_created
  ON public.requirement_matches (requirement_id, status, created_at DESC, id);

CREATE OR REPLACE FUNCTION public.get_broker_dashboard_metrics(
  p_user_id UUID,
  p_broker_profile_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_listings BIGINT,
  active_listings BIGINT,
  pending_listings BIGINT,
  public_enquiries BIGINT,
  active_chats BIGINT,
  total_requirements BIGINT,
  active_requirements BIGINT,
  incoming_requirement_matches BIGINT,
  unread_requirement_notifications BIGINT,
  listings_this_week BIGINT,
  pending_listings_this_week BIGINT,
  attention_listings BIGINT,
  new_enquiries BIGINT,
  enquiries_this_week BIGINT,
  chats_this_week BIGINT,
  requirements_this_week BIGINT,
  closed_requirements BIGINT,
  inactive_requirements BIGINT,
  contacted_requirement_matches BIGINT,
  listings_with_chats BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH input AS (
    SELECT CURRENT_TIMESTAMP - INTERVAL '7 days' AS week_start
  ),
  listing_counts AS (
    SELECT
      COUNT(*) AS total_listings,
      COUNT(*) FILTER (WHERE listing.status IN ('active', 'approved')) AS active_listings,
      COUNT(*) FILTER (WHERE listing.status = 'pending') AS pending_listings,
      COUNT(*) FILTER (WHERE listing.status IN ('rejected', 'inactive', 'expired')) AS attention_listings,
      COUNT(*) FILTER (WHERE listing.updated_at >= input.week_start) AS listings_this_week,
      COUNT(*) FILTER (WHERE listing.status = 'pending' AND listing.updated_at >= input.week_start) AS pending_listings_this_week
    FROM public.listings AS listing
    CROSS JOIN input
    WHERE listing.created_by = p_user_id
      AND listing.deleted_at IS NULL
  ),
  lead_counts AS (
    SELECT
      COUNT(*) AS public_enquiries,
      COUNT(*) FILTER (WHERE lead.lead_status = 'new') AS new_enquiries,
      COUNT(*) FILTER (WHERE lead.created_at >= input.week_start) AS enquiries_this_week
    FROM public.leads AS lead
    CROSS JOIN input
    WHERE lead.to_user_id = p_user_id
  ),
  chat_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE conversation.last_message_id IS NOT NULL) AS active_chats,
      COUNT(*) FILTER (WHERE conversation.last_message_at >= input.week_start) AS chats_this_week
    FROM public.chat_conversations AS conversation
    CROSS JOIN input
    WHERE conversation.owner_user_id = p_user_id
      OR conversation.broker_user_id = p_user_id
  ),
  requirement_counts AS (
    SELECT
      COUNT(*) AS total_requirements,
      COUNT(*) FILTER (WHERE requirement.is_active = TRUE) AS active_requirements,
      COUNT(*) FILTER (WHERE requirement.created_at >= input.week_start) AS requirements_this_week,
      COUNT(*) FILTER (WHERE requirement.deleted_at IS NOT NULL) AS closed_requirements,
      COUNT(*) FILTER (WHERE requirement.is_active = FALSE AND requirement.deleted_at IS NULL) AS inactive_requirements
    FROM public.requirements AS requirement
    CROSS JOIN input
    WHERE p_broker_profile_id IS NOT NULL
      AND requirement.broker_id = p_broker_profile_id
  ),
  requirement_match_counts AS (
    SELECT
      COUNT(*) AS incoming_requirement_matches,
      COUNT(*) FILTER (WHERE requirement_match.status = 'contacted') AS contacted_requirement_matches
    FROM public.requirement_matches AS requirement_match
    JOIN public.requirements AS requirement
      ON requirement.id = requirement_match.requirement_id
    WHERE p_broker_profile_id IS NOT NULL
      AND requirement.broker_id = p_broker_profile_id
  ),
  notification_counts AS (
    SELECT COUNT(*) AS unread_requirement_notifications
    FROM public.broker_notifications AS notification
    WHERE p_broker_profile_id IS NOT NULL
      AND notification.recipient_broker_id = p_broker_profile_id
      AND notification.is_read = FALSE
  )
  SELECT
    COALESCE(listing_counts.total_listings, 0),
    COALESCE(listing_counts.active_listings, 0),
    COALESCE(listing_counts.pending_listings, 0),
    COALESCE(lead_counts.public_enquiries, 0),
    COALESCE(chat_counts.active_chats, 0),
    COALESCE(requirement_counts.total_requirements, 0),
    COALESCE(requirement_counts.active_requirements, 0),
    COALESCE(requirement_match_counts.incoming_requirement_matches, 0),
    COALESCE(notification_counts.unread_requirement_notifications, 0),
    COALESCE(listing_counts.listings_this_week, 0),
    COALESCE(listing_counts.pending_listings_this_week, 0),
    COALESCE(listing_counts.attention_listings, 0),
    COALESCE(lead_counts.new_enquiries, 0),
    COALESCE(lead_counts.enquiries_this_week, 0),
    COALESCE(chat_counts.chats_this_week, 0),
    COALESCE(requirement_counts.requirements_this_week, 0),
    COALESCE(requirement_counts.closed_requirements, 0),
    COALESCE(requirement_counts.inactive_requirements, 0),
    COALESCE(requirement_match_counts.contacted_requirement_matches, 0),
    COALESCE(chat_counts.active_chats, 0)
  FROM listing_counts, lead_counts, chat_counts, requirement_counts, requirement_match_counts, notification_counts;
$$;

CREATE OR REPLACE FUNCTION public.get_requirement_submission_meta_for_broker(
  p_broker_profile_id UUID
)
RETURNS TABLE (
  requirement_id UUID,
  submission_count BIGINT,
  latest_submission_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    requirement.id AS requirement_id,
    COUNT(requirement_match.id) AS submission_count,
    MAX(requirement_match.created_at) AS latest_submission_at
  FROM public.requirements AS requirement
  LEFT JOIN public.requirement_matches AS requirement_match
    ON requirement_match.requirement_id = requirement.id
  WHERE requirement.broker_id = p_broker_profile_id
  GROUP BY requirement.id;
$$;

REVOKE ALL ON FUNCTION public.get_broker_dashboard_metrics(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_requirement_submission_meta_for_broker(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_broker_dashboard_metrics(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_requirement_submission_meta_for_broker(UUID) TO service_role;
