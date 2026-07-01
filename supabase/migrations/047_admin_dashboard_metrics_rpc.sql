-- Define the RPC function to consolidate admin overview metrics
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics(p_week_start TIMESTAMP WITH TIME ZONE)
RETURNS TABLE (
  total_users INT,
  total_brokers INT,
  pending_applications INT,
  active_brokers INT,
  pending_broker_users_this_week INT,
  approved_broker_users_this_week INT,
  total_listings INT,
  active_listings INT,
  pending_listings INT,
  pending_listings_this_week INT,
  approved_listings_this_week INT,
  total_requirements INT,
  active_requirements INT,
  active_requirements_this_week INT,
  public_enquiries INT,
  coming_soon_registrations INT,
  total_chats INT,
  activity_count INT
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INT FROM public.users),
    (SELECT COUNT(*)::INT FROM public.users WHERE role = 'broker'),
    (SELECT COUNT(*)::INT FROM public.users WHERE role = 'broker' AND status = 'pending'),
    (SELECT COUNT(*)::INT FROM public.users WHERE role = 'broker' AND status IN ('active', 'approved')),
    (SELECT COUNT(*)::INT FROM public.users WHERE role = 'broker' AND status = 'pending' AND created_at >= p_week_start),
    (SELECT COUNT(*)::INT FROM public.users WHERE role = 'broker' AND status IN ('active', 'approved') AND updated_at >= p_week_start),
    
    (SELECT COUNT(*)::INT FROM public.listings),
    (SELECT COUNT(*)::INT FROM public.listings WHERE deleted_at IS NULL AND status IN ('active', 'approved')),
    (SELECT COUNT(*)::INT FROM public.listings WHERE deleted_at IS NULL AND status = 'pending'),
    (SELECT COUNT(*)::INT FROM public.listings WHERE deleted_at IS NULL AND status = 'pending' AND created_at >= p_week_start),
    (SELECT COUNT(*)::INT FROM public.listings WHERE deleted_at IS NULL AND status IN ('active', 'approved') AND (approved_at >= p_week_start OR updated_at >= p_week_start)),
    
    (SELECT COUNT(*)::INT FROM public.requirements),
    (SELECT COUNT(*)::INT FROM public.requirements WHERE deleted_at IS NULL AND is_active = true),
    (SELECT COUNT(*)::INT FROM public.requirements WHERE deleted_at IS NULL AND is_active = true AND created_at >= p_week_start),
    
    (SELECT COUNT(*)::INT FROM public.leads),
    (SELECT COUNT(*)::INT FROM public.coming_soon_registrations),
    (SELECT COUNT(*)::INT FROM public.chat_conversations),
    (SELECT COUNT(*)::INT FROM public.activity_log WHERE target_table IS NULL OR target_table NOT IN ('chat_conversations', 'chat_conversation_messages', 'chat_messages'));
END;
$$ LANGUAGE plpgsql;
