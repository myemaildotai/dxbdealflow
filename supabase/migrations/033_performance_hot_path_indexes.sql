CREATE INDEX IF NOT EXISTS idx_users_role_status_created
  ON public.users (role, status, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_listings_market_visible_status_created
  ON public.listings (is_visible, status, created_at DESC, id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_market_area_price_created
  ON public.listings (area_id, price, created_at DESC, id)
  WHERE deleted_at IS NULL AND is_visible = TRUE;

CREATE INDEX IF NOT EXISTS idx_listings_market_property_price_created
  ON public.listings (property_type, price, created_at DESC, id)
  WHERE deleted_at IS NULL AND is_visible = TRUE;

CREATE INDEX IF NOT EXISTS idx_listings_owner_updated_not_deleted
  ON public.listings (created_by, updated_at DESC, id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_owner_status_updated_not_deleted
  ON public.listings (created_by, status, updated_at DESC, id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_status_created_not_deleted
  ON public.listings (status, created_at DESC, id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_sort
  ON public.listing_images (listing_id, sort_order ASC, id);

CREATE INDEX IF NOT EXISTS idx_leads_to_user_created
  ON public.leads (to_user_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_leads_listing_created
  ON public.leads (listing_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_requirements_active_created_not_deleted
  ON public.requirements (is_active, created_at DESC, id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_requirements_broker_updated
  ON public.requirements (broker_id, updated_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_requirements_posted_created
  ON public.requirements (posted_by, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_requirements_filter_created
  ON public.requirements (property_type, bedrooms, urgency, created_at DESC, id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_requirements_budget_window
  ON public.requirements (budget_max, budget_min, created_at DESC, id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_requirement_matches_requirement_created
  ON public.requirement_matches (requirement_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_requirement_matches_receiver_created
  ON public.requirement_matches (receiver_broker_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_requirement_matches_sender_created
  ON public.requirement_matches (sender_broker_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_requirement_matches_listing_sender_created
  ON public.requirement_matches (listing_id, sender_broker_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_broker_notifications_recipient_created
  ON public.broker_notifications (recipient_broker_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_broker_notifications_recipient_read_created
  ON public.broker_notifications (recipient_broker_id, is_read, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_admin_priority_queue_admin_created
  ON public.admin_priority_queue_notifications (admin_user_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_admin_priority_queue_admin_read_created
  ON public.admin_priority_queue_notifications (admin_user_id, is_read, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message_id_desc
  ON public.chat_conversations (last_message_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_listing_last_message
  ON public.chat_conversations (listing_id, last_message_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_actor_created
  ON public.activity_log (actor_user_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_activity_log_target_created
  ON public.activity_log (target_table, target_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_activity_log_table_created
  ON public.activity_log (target_table, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_activity_log_non_chat_created
  ON public.activity_log (created_at DESC, id)
  WHERE target_table IS NULL OR target_table NOT IN ('chat_conversations', 'chat_conversation_messages', 'chat_messages');
