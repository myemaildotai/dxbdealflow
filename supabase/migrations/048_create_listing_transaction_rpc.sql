-- Create create_listing_transaction SQL function to wrap listing creation logic in a single database transaction
CREATE OR REPLACE FUNCTION public.create_listing_transaction(
  p_listing_id UUID,
  p_user_id UUID,
  p_agency_id UUID,
  p_title TEXT,
  p_property_type TEXT,
  p_deal_type TEXT,
  p_bedrooms INT,
  p_size_sqft INT,
  p_area_id UUID,
  p_developer TEXT,
  p_price INT,
  p_payment_plan TEXT,
  p_handover_date DATE,
  p_yield_percent NUMERIC,
  p_property_video_url TEXT,
  p_notes TEXT,
  p_description TEXT,
  p_co_broke_percent NUMERIC,
  p_payment_terms TEXT,
  p_commission_notes TEXT,
  p_images JSONB,
  p_documents JSONB
)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
  v_available_credits INTEGER;
BEGIN
  -- Get and lock credits row
  SELECT available_credits INTO v_available_credits
  FROM public.broker_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_available_credits IS NULL OR v_available_credits < 1 THEN
    RAISE EXCEPTION 'You do not have enough listing credits to publish this listing.';
  END IF;

  -- Deduct credit
  UPDATE public.broker_credits
  SET available_credits = available_credits - 1,
      used_credits = used_credits + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Insert Listing
  INSERT INTO public.listings (
    id, title, property_type, deal_type, bedrooms, size_sqft, area_id, developer,
    price, payment_plan, handover_date, yield_percent, property_video_url, notes,
    description, status, is_visible, created_by, agency_id, credits_used, updated_at
  ) VALUES (
    p_listing_id, p_title, p_property_type, p_deal_type, p_bedrooms, p_size_sqft, p_area_id, p_developer,
    p_price, p_payment_plan, p_handover_date, p_yield_percent, p_property_video_url, p_notes,
    p_description, 'pending', FALSE, p_user_id, p_agency_id, 1, NOW()
  );

  -- Insert commission terms if applicable
  IF p_co_broke_percent > 0 OR p_payment_terms IS NOT NULL OR p_commission_notes IS NOT NULL THEN
    INSERT INTO public.commission_terms (listing_id, co_broke_percent, payment_terms, notes)
    VALUES (p_listing_id, COALESCE(p_co_broke_percent, 0.0), p_payment_terms, p_commission_notes);
  END IF;

  -- Insert listing images
  IF p_images IS NOT NULL AND jsonb_array_length(p_images) > 0 THEN
    INSERT INTO public.listing_images (listing_id, file_name, storage_path, public_url, sort_order, is_cover)
    SELECT p_listing_id, file_name, storage_path, public_url, sort_order, is_cover
    FROM jsonb_to_recordset(p_images) AS x(file_name TEXT, storage_path TEXT, public_url TEXT, sort_order INTEGER, is_cover BOOLEAN);
  END IF;

  -- Insert listing documents
  IF p_documents IS NOT NULL AND jsonb_array_length(p_documents) > 0 THEN
    INSERT INTO public.listing_documents (listing_id, file_name, storage_path, public_url)
    SELECT p_listing_id, file_name, storage_path, public_url
    FROM jsonb_to_recordset(p_documents) AS x(file_name TEXT, storage_path TEXT, public_url TEXT);
  END IF;

  -- Insert chat participant
  INSERT INTO public.chat_participants (listing_id, user_id, last_read_at)
  VALUES (p_listing_id, p_user_id, NOW())
  ON CONFLICT (listing_id, user_id) DO NOTHING;

  -- Insert activity log
  INSERT INTO public.activity_log (actor_user_id, action, target_table, target_id, metadata)
  VALUES (p_user_id, 'listing_created', 'listings', p_listing_id, '{"creditsUsed": 1}'::jsonb);

  RETURN p_listing_id;
END;
$$ LANGUAGE plpgsql;
