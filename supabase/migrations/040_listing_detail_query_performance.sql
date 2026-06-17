CREATE INDEX IF NOT EXISTS idx_chat_messages_listing_sender
  ON public.chat_messages (listing_id, sender_id);

CREATE OR REPLACE FUNCTION public.get_listing_detail_bundle(
  p_listing_id UUID,
  p_include_internal BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'listing',
    jsonb_build_object(
      'id', listing.id,
      'title', listing.title,
      'property_type', listing.property_type,
      'deal_type', listing.deal_type,
      'bedrooms', listing.bedrooms,
      'size_sqft', listing.size_sqft,
      'area_id', listing.area_id,
      'developer', listing.developer,
      'price', listing.price,
      'payment_plan', listing.payment_plan,
      'handover_date', listing.handover_date,
      'yield_percent', listing.yield_percent,
      'property_video_url', listing.property_video_url,
      'notes', listing.notes,
      'description', listing.description,
      'status', listing.status,
      'is_visible', listing.is_visible,
      'created_at', listing.created_at,
      'updated_at', listing.updated_at,
      'deleted_at', listing.deleted_at,
      'created_by', listing.created_by,
      'agency_id', listing.agency_id,
      'renewal_due_at', listing.renewal_due_at,
      'approved_at', listing.approved_at,
      'approval_notification_read_at', listing.approval_notification_read_at,
      'last_new_deal_alert_sent_at', listing.last_new_deal_alert_sent_at,
      'credits_used', listing.credits_used
    ),
    'area',
    (
      SELECT jsonb_build_object(
        'id', area.id,
        'name', area.name,
        'city', area.city,
        'slug', area.slug
      )
      FROM public.areas AS area
      WHERE area.id = listing.area_id
    ),
    'listing_images',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', image.id,
            'listing_id', image.listing_id,
            'file_name', image.file_name,
            'storage_path', image.storage_path,
            'public_url', image.public_url,
            'sort_order', image.sort_order,
            'is_cover', image.is_cover,
            'created_at', image.created_at
          )
          ORDER BY image.sort_order ASC, image.id ASC
        )
        FROM public.listing_images AS image
        WHERE image.listing_id = listing.id
      ),
      '[]'::JSONB
    ),
    'listing_documents', '[]'::JSONB,
    'owner',
    CASE
      WHEN p_include_internal THEN (
        SELECT jsonb_build_object(
          'id', owner_user.id,
          'email', owner_user.email,
          'first_name', owner_user.first_name,
          'last_name', owner_user.last_name,
          'phone', owner_user.phone,
          'role', owner_user.role,
          'status', owner_user.status,
          'agency_id', owner_user.agency_id,
          'created_at', owner_user.created_at,
          'updated_at', owner_user.updated_at
        )
        FROM public.users AS owner_user
        WHERE owner_user.id = listing.created_by
      )
      ELSE NULL
    END,
    'agency',
    CASE
      WHEN p_include_internal THEN (
        SELECT jsonb_build_object(
          'id', agency.id,
          'name', agency.name,
          'rera_brn', agency.rera_brn,
          'status', agency.status,
          'created_at', agency.created_at,
          'updated_at', agency.updated_at
        )
        FROM public.agencies AS agency
        WHERE agency.id = listing.agency_id
      )
      ELSE NULL
    END,
    'commission_terms',
    CASE
      WHEN p_include_internal THEN (
        SELECT jsonb_build_object(
          'listing_id', terms.listing_id,
          'co_broke_percent', terms.co_broke_percent,
          'payment_terms', terms.payment_terms,
          'notes', terms.notes
        )
        FROM public.commission_terms AS terms
        WHERE terms.listing_id = listing.id
      )
      ELSE NULL
    END,
    'owner_active_listings_count',
    CASE
      WHEN p_include_internal THEN (
        SELECT COUNT(*)
        FROM public.listings AS owner_listing
        WHERE owner_listing.created_by = listing.created_by
          AND owner_listing.deleted_at IS NULL
          AND owner_listing.status IN ('active', 'approved')
      )
      ELSE NULL
    END,
    'public_broker',
    (
      SELECT jsonb_build_object(
        'first_name', owner_user.first_name,
        'last_name', owner_user.last_name,
        'profile_photo', broker_profile.profile_photo
      )
      FROM public.users AS owner_user
      LEFT JOIN public.broker_profiles AS broker_profile
        ON broker_profile.user_id = owner_user.id
      WHERE owner_user.id = listing.created_by
    ),
    'enquiry_count',
    (
      SELECT COUNT(*)
      FROM public.leads AS enquiry
      WHERE enquiry.listing_id = listing.id
    ),
    'brokers_engaged_count',
    (
      SELECT COUNT(*)
      FROM (
        SELECT conversation.broker_user_id AS broker_id
        FROM public.chat_conversations AS conversation
        WHERE conversation.listing_id = listing.id
          AND conversation.last_message_id IS NOT NULL
          AND conversation.broker_user_id <> listing.created_by
        UNION
        SELECT legacy_message.sender_id AS broker_id
        FROM public.chat_messages AS legacy_message
        INNER JOIN public.users AS legacy_sender
          ON legacy_sender.id = legacy_message.sender_id
        WHERE legacy_message.listing_id = listing.id
          AND legacy_message.sender_id <> listing.created_by
          AND legacy_sender.role = 'broker'
      ) AS engaged_broker
    )
  )
  FROM public.listings AS listing
  WHERE listing.id = p_listing_id;
$$;

REVOKE ALL ON FUNCTION public.get_listing_detail_bundle(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_detail_bundle(UUID, BOOLEAN) TO service_role;
