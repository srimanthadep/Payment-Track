-- ==============================================================================
-- Migration: Add Username Column to Profiles, Transactions, and Expenses
-- ==============================================================================

-- 1. Add username column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Set username for existing users
UPDATE public.profiles
SET username = 'sujan'
WHERE email ILIKE 'sujan%' OR id = '98cab8fb-b582-493f-91a0-b8f3954a1366';

UPDATE public.profiles
SET username = 'srimanth'
WHERE email ILIKE 'srimanth%' OR id = '92595244-9ecb-476b-8a7d-102ad84b8d42';

-- For any other existing profiles without username, set default from email prefix
UPDATE public.profiles
SET username = LOWER(SPLIT_PART(email, '@', 1))
WHERE username IS NULL;

-- Create unique index on username in profiles
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 2. Add username column to transactions table (positioned right after user_id)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Populate username for all existing transactions from profiles table
UPDATE public.transactions t
SET username = p.username
FROM public.profiles p
WHERE t.user_id = p.id AND (t.username IS NULL OR t.username = '');

-- Fallback for Sujan's transactions
UPDATE public.transactions
SET username = 'sujan'
WHERE user_id = '98cab8fb-b582-493f-91a0-b8f3954a1366' AND (username IS NULL OR username = '');

-- Create index for fast filtering by username
CREATE INDEX IF NOT EXISTS idx_transactions_username ON public.transactions(username);

-- 3. Add username column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Populate username for all existing expenses
UPDATE public.expenses e
SET username = p.username
FROM public.profiles p
WHERE e.user_id = p.id AND (e.username IS NULL OR e.username = '');

CREATE INDEX IF NOT EXISTS idx_expenses_username ON public.expenses(username);

-- 4. Auto-populate username Trigger for new Transactions
CREATE OR REPLACE FUNCTION public.set_transaction_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    SELECT username INTO NEW.username
    FROM public.profiles
    WHERE id = NEW.user_id;
  END IF;

  -- Fallback if still null
  IF NEW.username IS NULL THEN
    NEW.username := 'user';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_set_transaction_username ON public.transactions;
CREATE TRIGGER trg_set_transaction_username
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_transaction_username();

-- 5. Auto-populate username Trigger for new Expenses
CREATE OR REPLACE FUNCTION public.set_expense_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    SELECT username INTO NEW.username
    FROM public.profiles
    WHERE id = NEW.user_id;
  END IF;

  IF NEW.username IS NULL THEN
    NEW.username := 'user';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_set_expense_username ON public.expenses;
CREATE TRIGGER trg_set_expense_username
  BEFORE INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_expense_username();

-- 6. Update handle_new_user() signup trigger to capture username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_username TEXT;
  extracted_fullname TEXT;
  extracted_business TEXT;
BEGIN
  extracted_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1)
  );

  extracted_fullname := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    extracted_username
  );

  extracted_business := COALESCE(
    NEW.raw_user_meta_data->>'business_name',
    'My Business'
  );

  -- Insert or update profile with username
  INSERT INTO public.profiles (id, email, full_name, business_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    extracted_fullname,
    extracted_business,
    extracted_username
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    full_name = EXCLUDED.full_name,
    business_name = COALESCE(EXCLUDED.business_name, public.profiles.business_name),
    updated_at = now();

  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
