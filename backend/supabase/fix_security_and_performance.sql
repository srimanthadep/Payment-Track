-- ========================================================
-- Comprehensive Database Security, Performance & Integrity Fixes
-- Applied to project: Tracker (rzslgglgpbvjytjqnair)
-- ========================================================

-- 1. Helper function in unexposed 'private' schema for safe admin checks without RLS recursion
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = user_uuid AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION private.is_admin(uuid) FROM anon, public;

-- Drop legacy public.is_admin if present
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- 2. Function Security Hardening (Set search_path & Revoke public execute on triggers)
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_transaction_profit() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_expense_username() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_transaction_username() FROM public, anon, authenticated;

-- 3. Foreign Key Constraints (ON DELETE CASCADE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_auth_users'
  ) THEN
    ALTER TABLE public.profiles 
      ADD CONSTRAINT fk_profiles_auth_users 
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_goals_auth_users'
  ) THEN
    ALTER TABLE public.goals 
      ADD CONSTRAINT fk_goals_auth_users 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Composite Index for high-speed transaction filtering
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date 
  ON public.transactions (user_id, transaction_type, transaction_date DESC);

-- 5. Row Level Security Policies

-- (A) TRANSACTIONS
DROP POLICY IF EXISTS "transactions_policy" ON public.transactions;
DROP POLICY IF EXISTS "Users select own or admin all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users update own or admin transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users delete own or admin transactions" ON public.transactions;

CREATE POLICY "Users select own or admin all transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR private.is_admin((SELECT auth.uid())));

CREATE POLICY "Users insert own transactions"
  ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users update own or admin transactions"
  ON public.transactions FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR private.is_admin((SELECT auth.uid())))
  WITH CHECK (user_id = (SELECT auth.uid()) OR private.is_admin((SELECT auth.uid())));

CREATE POLICY "Users delete own or admin transactions"
  ON public.transactions FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR private.is_admin((SELECT auth.uid())));

-- (B) GOALS
DROP POLICY IF EXISTS "goals_policy" ON public.goals;
DROP POLICY IF EXISTS "Users manage own goals" ON public.goals;

CREATE POLICY "Users manage own goals"
  ON public.goals FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- (C) PROFILES
DROP POLICY IF EXISTS "profiles_policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or admin" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile or admin" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile or admin"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()) OR private.is_admin((SELECT auth.uid())))
  WITH CHECK (id = (SELECT auth.uid()) OR private.is_admin((SELECT auth.uid())));

CREATE POLICY "Users can insert own profile or admin"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()) OR private.is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (private.is_admin((SELECT auth.uid())));

-- (D) USER_ROLES
DROP POLICY IF EXISTS "user_roles_policy" ON public.user_roles;
DROP POLICY IF EXISTS "Users view own role or admin all" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;

CREATE POLICY "Users view own role or admin all"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR private.is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can insert user roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (private.is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can update user roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (private.is_admin((SELECT auth.uid())))
  WITH CHECK (private.is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete user roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (private.is_admin((SELECT auth.uid())));

-- (E) PORTALS
DROP POLICY IF EXISTS "portals_policy" ON public.portals;
DROP POLICY IF EXISTS "Portals viewable by authenticated" ON public.portals;
DROP POLICY IF EXISTS "Admins manage portals" ON public.portals;
DROP POLICY IF EXISTS "Admins can insert portals" ON public.portals;
DROP POLICY IF EXISTS "Admins can update portals" ON public.portals;
DROP POLICY IF EXISTS "Admins can delete portals" ON public.portals;

CREATE POLICY "Portals viewable by authenticated"
  ON public.portals FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert portals"
  ON public.portals FOR INSERT TO authenticated
  WITH CHECK (private.is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can update portals"
  ON public.portals FOR UPDATE TO authenticated
  USING (private.is_admin((SELECT auth.uid())))
  WITH CHECK (private.is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete portals"
  ON public.portals FOR DELETE TO authenticated
  USING (private.is_admin((SELECT auth.uid())));

-- (F) DROP UNUSED PORTAL_RATES TABLE
DROP TABLE IF EXISTS public.portal_rates CASCADE;

-- (G) CARD_TYPES
DROP POLICY IF EXISTS "Card types viewable by authenticated" ON public.card_types;
DROP POLICY IF EXISTS "Admins manage card types" ON public.card_types;
DROP POLICY IF EXISTS "Admins can insert card types" ON public.card_types;
DROP POLICY IF EXISTS "Admins can update card types" ON public.card_types;
DROP POLICY IF EXISTS "Admins can delete card types" ON public.card_types;

CREATE POLICY "Card types viewable by authenticated"
  ON public.card_types FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert card types"
  ON public.card_types FOR INSERT TO authenticated
  WITH CHECK (private.is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can update card types"
  ON public.card_types FOR UPDATE TO authenticated
  USING (private.is_admin((SELECT auth.uid())))
  WITH CHECK (private.is_admin((SELECT auth.uid())));

CREATE POLICY "Admins can delete card types"
  ON public.card_types FOR DELETE TO authenticated
  USING (private.is_admin((SELECT auth.uid())));

-- (H) EXPENSES (auth_rls_initplan optimized)
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;

CREATE POLICY "Users can view their own expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own expenses"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own expenses"
  ON public.expenses FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- (I) DUES (auth_rls_initplan optimized)
DROP POLICY IF EXISTS "Users can view their own dues" ON public.dues;
DROP POLICY IF EXISTS "Users can insert their own dues" ON public.dues;
DROP POLICY IF EXISTS "Users can update their own dues" ON public.dues;
DROP POLICY IF EXISTS "Users can delete their own dues" ON public.dues;

CREATE POLICY "Users can view their own dues"
  ON public.dues FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own dues"
  ON public.dues FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own dues"
  ON public.dues FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own dues"
  ON public.dues FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- (J) CUSTOMERS (auth_rls_initplan optimized)
DROP POLICY IF EXISTS "Users manage own customers" ON public.customers;

CREATE POLICY "Users manage own customers"
  ON public.customers FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- (K) ACTIVITY_LOGS (auth_rls_initplan optimized)
DROP POLICY IF EXISTS "Users can read own logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON public.activity_logs;

CREATE POLICY "Users can read own logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own logs"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- (L) APP_SETTINGS (auth_rls_initplan optimized & deduplicated)
DROP POLICY IF EXISTS "Users can view their own settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can insert/update their own settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users manage own settings" ON public.app_settings;

CREATE POLICY "Users manage own settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
