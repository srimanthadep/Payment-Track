-- ========================================================
-- Comprehensive Database Schema Refinement & Integrity Enhancements
-- Project: Tracker (rzslgglgpbvjytjqnair)
-- ========================================================

-- 1. DROP GHOST & DEAD COLUMNS
-- Drop unused payee & reference columns from expenses
ALTER TABLE public.expenses 
  DROP COLUMN IF EXISTS paid_to,
  DROP COLUMN IF EXISTS reference_number;

-- Drop redundant username denormalization and trigger on expenses
DROP TRIGGER IF EXISTS trg_set_expense_username ON public.expenses;
DROP FUNCTION IF EXISTS public.set_expense_username();
ALTER TABLE public.expenses 
  DROP COLUMN IF EXISTS username;

-- Drop 100% null ip_address from activity_logs
ALTER TABLE public.activity_logs 
  DROP COLUMN IF EXISTS ip_address;

-- Drop 100% null phone_number from profiles
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS phone_number;

-- 2. DROP REDUNDANT CARD_TYPES TABLE
DROP TABLE IF EXISTS public.card_types CASCADE;

-- 3. ADD RELATIONAL & PROFILE ENHANCEMENTS
-- Directly store user avatar URLs on profiles for admin tables & leaderboards
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Link borrower dues directly to customers in CRM
ALTER TABLE public.dues 
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- Structured payment method on transactions
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'Cash';

-- 4. ADD DATA INTEGRITY CHECK CONSTRAINTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_amount'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT chk_transactions_amount CHECK (amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_type_not_empty'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT chk_transactions_type_not_empty CHECK (length(trim(transaction_type)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_goals_target'
  ) THEN
    ALTER TABLE public.goals
      ADD CONSTRAINT chk_goals_target CHECK (target_amount > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_goals_dates'
  ) THEN
    ALTER TABLE public.goals
      ADD CONSTRAINT chk_goals_dates CHECK (period_end >= period_start);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_dues_amounts'
  ) THEN
    ALTER TABLE public.dues
      ADD CONSTRAINT chk_dues_amounts CHECK (principal_amount >= 0 AND amount_paid >= 0);
  END IF;
END $$;

-- 5. ATTACH MISSING UPDATED_AT TRIGGERS
DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_goals_updated_at ON public.goals;
CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. PERFORMANCE COMPOSITE INDEXES
CREATE INDEX IF NOT EXISTS idx_dues_user_status ON public.dues (user_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses (user_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_customers_user_name ON public.customers (user_id, name);
CREATE INDEX IF NOT EXISTS idx_dues_customer_id ON public.dues (customer_id) WHERE customer_id IS NOT NULL;
