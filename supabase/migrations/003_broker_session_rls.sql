DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select_self_or_admin" ON users
  FOR SELECT USING (auth.uid() = id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "broker_profiles_select" ON broker_profiles;
CREATE POLICY "broker_profiles_select_self_or_admin" ON broker_profiles
  FOR SELECT USING (auth.uid() = user_id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "broker_profiles_update_self_or_admin" ON broker_profiles
  FOR UPDATE USING (auth.uid() = user_id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK (auth.uid() = user_id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "broker_credits_select" ON broker_credits;
CREATE POLICY "broker_credits_select_self_or_admin" ON broker_credits
  FOR SELECT USING (auth.uid() = user_id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "users_update_self_or_admin" ON users
  FOR UPDATE USING (auth.uid() = id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin')
  WITH CHECK (auth.uid() = id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');
