-- ========================================================
-- Schema Improvements & Integrity Fixes
-- Applied to project: Tracker (rzslgglgpbvjytjqnair)
-- ========================================================

-- 1. Create whatsapp_message_log table
CREATE TABLE IF NOT EXISTS public.whatsapp_message_log (
    id BIGSERIAL PRIMARY KEY,
    phone TEXT NOT NULL,
    action TEXT NOT NULL,          -- 'welcome' | 'receipt' | 'reminder'
    message TEXT,
    status TEXT NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed'
    error TEXT,
    customer_id TEXT,
    customer_name TEXT,
    transaction_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_log_created ON public.whatsapp_message_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_log_user ON public.whatsapp_message_log(user_id);

ALTER TABLE public.whatsapp_message_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own whatsapp logs" ON public.whatsapp_message_log;
CREATE POLICY "Users can view their own whatsapp logs"
    ON public.whatsapp_message_log FOR SELECT
    TO authenticated
    USING (
      user_id = (SELECT auth.uid()) OR 
      user_id = private.get_business_id((SELECT auth.uid())) OR 
      private.is_admin((SELECT auth.uid()))
    );

DROP POLICY IF EXISTS "Authenticated users can insert whatsapp logs" ON public.whatsapp_message_log;
CREATE POLICY "Authenticated users can insert whatsapp logs"
    ON public.whatsapp_message_log FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = (SELECT auth.uid()) OR 
      user_id = private.get_business_id((SELECT auth.uid())) OR 
      private.is_admin((SELECT auth.uid()))
    );

-- Enable Realtime for whatsapp_message_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_message_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_message_log;
  END IF;
END $$;

-- 2. Add commission_percent and site_fee_percent columns to transactions
ALTER TABLE public.transactions 
    ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS site_fee_percent NUMERIC(5, 2);

-- Backfill percentage from notes where present
UPDATE public.transactions
SET 
  commission_percent = CAST(substring(notes FROM 'Commission:\s*([0-9.]+)') AS NUMERIC(5, 2))
WHERE commission_percent IS NULL AND notes ~ 'Commission:\s*[0-9.]+';

UPDATE public.transactions
SET 
  site_fee_percent = CAST(substring(notes FROM 'Site Fee:\s*([0-9.]+)') AS NUMERIC(5, 2))
WHERE site_fee_percent IS NULL AND notes ~ 'Site Fee:\s*[0-9.]+';

-- Fallback backfill where commission amount exists
UPDATE public.transactions
SET 
  commission_percent = ROUND((commission / amount) * 100, 2)
WHERE commission_percent IS NULL AND amount > 0 AND commission > 0;

-- 3. Composite Index on transactions for 5-tier AI Learning cascade
CREATE INDEX IF NOT EXISTS idx_transactions_learning 
    ON public.transactions (user_id, card_type, transaction_type);

-- 4. Drop redundant unique constraint on goals
ALTER TABLE public.goals 
    DROP CONSTRAINT IF EXISTS goals_user_type_period_key;

-- 5. Staff access RLS for dues table
DROP POLICY IF EXISTS "Users can view their own dues" ON public.dues;
DROP POLICY IF EXISTS "Users can insert their own dues" ON public.dues;
DROP POLICY IF EXISTS "Users can update their own dues" ON public.dues;
DROP POLICY IF EXISTS "Users can delete their own dues" ON public.dues;
DROP POLICY IF EXISTS "Users and staff view dues" ON public.dues;
DROP POLICY IF EXISTS "Users and staff insert dues" ON public.dues;
DROP POLICY IF EXISTS "Users and staff update dues" ON public.dues;
DROP POLICY IF EXISTS "Users and staff delete dues" ON public.dues;

CREATE POLICY "Users and staff view dues"
    ON public.dues FOR SELECT
    TO authenticated
    USING (
      user_id = (SELECT auth.uid()) OR 
      user_id = private.get_business_id((SELECT auth.uid())) OR 
      private.is_admin((SELECT auth.uid()))
    );

CREATE POLICY "Users and staff insert dues"
    ON public.dues FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = (SELECT auth.uid()) OR 
      user_id = private.get_business_id((SELECT auth.uid())) OR 
      private.is_admin((SELECT auth.uid()))
    );

CREATE POLICY "Users and staff update dues"
    ON public.dues FOR UPDATE
    TO authenticated
    USING (
      user_id = (SELECT auth.uid()) OR 
      user_id = private.get_business_id((SELECT auth.uid())) OR 
      private.is_admin((SELECT auth.uid()))
    )
    WITH CHECK (
      user_id = (SELECT auth.uid()) OR 
      user_id = private.get_business_id((SELECT auth.uid())) OR 
      private.is_admin((SELECT auth.uid()))
    );

CREATE POLICY "Users and staff delete dues"
    ON public.dues FOR DELETE
    TO authenticated
    USING (
      user_id = (SELECT auth.uid()) OR 
      private.is_admin((SELECT auth.uid()))
    );

-- 6. Tighten policies on customers, expenses, transactions to authenticated role
-- (A) CUSTOMERS
DROP POLICY IF EXISTS "Users and staff manage customers" ON public.customers;
CREATE POLICY "Users and staff manage customers"
    ON public.customers FOR ALL
    TO authenticated
    USING (
      user_id = (SELECT auth.uid()) OR 
      user_id = private.get_business_id((SELECT auth.uid())) OR 
      private.is_admin((SELECT auth.uid()))
    )
    WITH CHECK (
      user_id = (SELECT auth.uid()) OR 
      user_id = private.get_business_id((SELECT auth.uid())) OR 
      private.is_admin((SELECT auth.uid()))
    );

-- (B) EXPENSES
DROP POLICY IF EXISTS "Users and staff view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users and staff insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users and staff update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users and staff delete expenses" ON public.expenses;

CREATE POLICY "Users and staff view expenses"
    ON public.expenses FOR SELECT
    TO authenticated
    USING (
      user_id = (SELECT auth.uid()) OR 
      user_id = private.get_business_id((SELECT auth.uid())) OR 
      private.is_admin((SELECT auth.uid()))
    );

CREATE POLICY "Users and staff insert expenses"
    ON public.expenses FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = (SELECT auth.uid()) OR 
      user_id = private.get_business_id((SELECT auth.uid())) OR 
      private.is_admin((SELECT auth.uid()))
    );

CREATE POLICY "Users and staff update expenses"
    ON public.expenses FOR UPDATE
    TO authenticated
    USING (
      user_id = (SELECT auth.uid()) OR 
      user_id = private.get_business_id((SELECT auth.uid())) OR 
      private.is_admin((SELECT auth.uid()))
    )
    WITH CHECK (
      user_id = (SELECT auth.uid()) OR 
      user_id = private.get_business_id((SELECT auth.uid())) OR 
      private.is_admin((SELECT auth.uid()))
    );

CREATE POLICY "Users and staff delete expenses"
    ON public.expenses FOR DELETE
    TO authenticated
    USING (
      user_id = (SELECT auth.uid()) OR 
      user_id = private.get_business_id((SELECT auth.uid())) OR 
      private.is_admin((SELECT auth.uid()))
    );

-- (C) TRANSACTIONS
DROP POLICY IF EXISTS "Users and staff select transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users and staff insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users update own or admin transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users delete own or admin transactions" ON public.transactions;

CREATE POLICY "Users and staff select transactions"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (
      user_id = (SELECT auth.uid()) OR 
      user_id = private.get_business_id((SELECT auth.uid())) OR 
      private.is_admin((SELECT auth.uid()))
    );

CREATE POLICY "Users and staff insert transactions"
    ON public.transactions FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = (SELECT auth.uid()) OR 
      user_id = private.get_business_id((SELECT auth.uid())) OR 
      private.is_admin((SELECT auth.uid()))
    );

CREATE POLICY "Users update own or admin transactions"
    ON public.transactions FOR UPDATE
    TO authenticated
    USING (
      user_id = (SELECT auth.uid()) OR 
      private.is_admin((SELECT auth.uid()))
    )
    WITH CHECK (
      user_id = (SELECT auth.uid()) OR 
      private.is_admin((SELECT auth.uid()))
    );

CREATE POLICY "Users delete own or admin transactions"
    ON public.transactions FOR DELETE
    TO authenticated
    USING (
      user_id = (SELECT auth.uid()) OR 
      private.is_admin((SELECT auth.uid()))
    );
