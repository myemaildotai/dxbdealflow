ALTER TABLE IF EXISTS public.admin_priority_queue_notifications REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.broker_notifications REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.chat_conversation_messages REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.leads REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.listings REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.requirements REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.requirement_matches REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.users REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.broker_profiles REPLICA IDENTITY FULL;

GRANT SELECT ON TABLE
  public.admin_priority_queue_notifications,
  public.broker_notifications,
  public.chat_conversations,
  public.chat_conversation_messages,
  public.leads,
  public.listings,
  public.requirements,
  public.requirement_matches,
  public.users,
  public.broker_profiles
TO authenticated;

DO $$
DECLARE
  realtime_table TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH realtime_table IN ARRAY ARRAY[
      'admin_priority_queue_notifications',
      'broker_notifications',
      'chat_conversations',
      'chat_conversation_messages',
      'leads',
      'listings',
      'requirements',
      'requirement_matches',
      'users',
      'broker_profiles'
    ]
    LOOP
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = realtime_table
      )
      AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = realtime_table
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', realtime_table);
      END IF;
    END LOOP;
  END IF;
END $$;
