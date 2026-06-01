CREATE OR REPLACE FUNCTION public.current_app_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.role
  FROM public.users u
  WHERE u.id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_app_user_status()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.status
  FROM public.users u
  WHERE u.id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_app_user_role() = 'admin', FALSE)
$$;

CREATE OR REPLACE FUNCTION public.is_active_broker_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.current_app_user_role() = 'broker'
    AND public.current_app_user_status() = 'active',
    FALSE
  )
$$;

DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_select_self_or_admin" ON users;
DROP POLICY IF EXISTS "users_update_self_or_admin" ON users;

CREATE POLICY "users_select_self_or_admin" ON users
  FOR SELECT USING (auth.uid() = id OR public.is_admin_user());

CREATE POLICY "users_update_self_or_admin" ON users
  FOR UPDATE USING (auth.uid() = id OR public.is_admin_user())
  WITH CHECK (auth.uid() = id OR public.is_admin_user());

DROP POLICY IF EXISTS "broker_profiles_select" ON broker_profiles;
DROP POLICY IF EXISTS "broker_profiles_select_self_or_admin" ON broker_profiles;
DROP POLICY IF EXISTS "broker_profiles_update_self_or_admin" ON broker_profiles;

CREATE POLICY "broker_profiles_select_self_or_admin" ON broker_profiles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_user());

CREATE POLICY "broker_profiles_update_self_or_admin" ON broker_profiles
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_user())
  WITH CHECK (auth.uid() = user_id OR public.is_admin_user());

DROP POLICY IF EXISTS "broker_credits_select" ON broker_credits;
DROP POLICY IF EXISTS "broker_credits_select_self_or_admin" ON broker_credits;

CREATE POLICY "broker_credits_select_self_or_admin" ON broker_credits
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_user());

DROP POLICY IF EXISTS "leads_select" ON leads;

CREATE POLICY "leads_select" ON leads
  FOR SELECT USING (auth.uid() = to_user_id OR auth.uid() = from_user_id OR public.is_admin_user());

DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;

CREATE POLICY "chat_messages_select" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM chat_participants
      WHERE chat_participants.listing_id = chat_messages.listing_id
        AND chat_participants.user_id = auth.uid()
    )
    OR public.is_admin_user()
  );

DROP POLICY IF EXISTS "chat_participants_select" ON chat_participants;

CREATE POLICY "chat_participants_select" ON chat_participants
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_user());

DROP POLICY IF EXISTS "chat_conversations_select" ON chat_conversations;

CREATE POLICY "chat_conversations_select" ON chat_conversations
  FOR SELECT USING (
    owner_user_id = auth.uid()
    OR broker_user_id = auth.uid()
    OR public.is_admin_user()
  );

DROP POLICY IF EXISTS "chat_conversation_messages_select" ON chat_conversation_messages;

CREATE POLICY "chat_conversation_messages_select" ON chat_conversation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM chat_conversations
      WHERE chat_conversations.id = chat_conversation_messages.conversation_id
        AND (
          chat_conversations.owner_user_id = auth.uid()
          OR chat_conversations.broker_user_id = auth.uid()
          OR public.is_admin_user()
        )
    )
  );

DROP POLICY IF EXISTS requirements_select_active_or_owner_or_admin ON requirements;
DROP POLICY IF EXISTS requirements_insert_own_or_admin ON requirements;
DROP POLICY IF EXISTS requirements_update_own_or_admin ON requirements;
DROP POLICY IF EXISTS requirements_delete_own_or_admin ON requirements;

CREATE POLICY requirements_select_active_or_owner_or_admin ON requirements
FOR SELECT USING (
  public.is_admin_user()
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = requirements.broker_id
      AND bp.user_id = auth.uid()
  )
  OR (
    requirements.is_active = TRUE
    AND public.is_active_broker_user()
  )
);

CREATE POLICY requirements_insert_own_or_admin ON requirements
FOR INSERT WITH CHECK (
  public.is_admin_user()
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = requirements.broker_id
      AND bp.user_id = auth.uid()
      AND public.is_active_broker_user()
  )
);

CREATE POLICY requirements_update_own_or_admin ON requirements
FOR UPDATE USING (
  public.is_admin_user()
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = requirements.broker_id
      AND bp.user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin_user()
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = requirements.broker_id
      AND bp.user_id = auth.uid()
      AND public.is_active_broker_user()
  )
);

CREATE POLICY requirements_delete_own_or_admin ON requirements
FOR DELETE USING (
  public.is_admin_user()
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = requirements.broker_id
      AND bp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS requirement_matches_select_owner_sender_or_admin ON requirement_matches;
DROP POLICY IF EXISTS requirement_matches_insert_sender_or_admin ON requirement_matches;

CREATE POLICY requirement_matches_select_owner_sender_or_admin ON requirement_matches
FOR SELECT USING (
  public.is_admin_user()
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = requirement_matches.sender_broker_id
      AND bp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM requirements r
    JOIN broker_profiles bp ON bp.id = r.broker_id
    WHERE r.id = requirement_matches.requirement_id
      AND bp.user_id = auth.uid()
  )
);

CREATE POLICY requirement_matches_insert_sender_or_admin ON requirement_matches
FOR INSERT WITH CHECK (
  public.is_admin_user()
  OR EXISTS (
    SELECT 1
    FROM broker_profiles sender_bp
    JOIN requirements r ON r.id = requirement_matches.requirement_id
    WHERE sender_bp.id = requirement_matches.sender_broker_id
      AND sender_bp.user_id = auth.uid()
      AND public.is_active_broker_user()
      AND r.is_active = TRUE
      AND r.broker_id <> requirement_matches.sender_broker_id
  )
);

DROP POLICY IF EXISTS broker_notifications_select_own_or_admin ON broker_notifications;
DROP POLICY IF EXISTS broker_notifications_update_own_or_admin ON broker_notifications;

CREATE POLICY broker_notifications_select_own_or_admin ON broker_notifications
FOR SELECT USING (
  public.is_admin_user()
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = broker_notifications.recipient_broker_id
      AND bp.user_id = auth.uid()
  )
);

CREATE POLICY broker_notifications_update_own_or_admin ON broker_notifications
FOR UPDATE USING (
  public.is_admin_user()
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = broker_notifications.recipient_broker_id
      AND bp.user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin_user()
  OR EXISTS (
    SELECT 1
    FROM broker_profiles bp
    WHERE bp.id = broker_notifications.recipient_broker_id
      AND bp.user_id = auth.uid()
  )
);
