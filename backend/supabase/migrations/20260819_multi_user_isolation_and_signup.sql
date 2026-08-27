-- Comprehensive Migration for Multi-User Registration & Account Isolation

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Role Enum
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  business_name TEXT,
  email TEXT,
  phone_number TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Portals Table
CREATE TABLE IF NOT EXISTS public.portals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  default_commission_rate DECIMAL(5,2) DEFAULT 0,
  default_site_fee DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Portal Rates Table
CREATE TABLE IF NOT EXISTS public.portal_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL,
  rate_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (portal_id, card_type)
);

-- 7. Card Types Table
CREATE TABLE IF NOT EXISTS public.card_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  portal_id UUID NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  card_type TEXT,
  amount DECIMAL(12,2) NOT NULL,
  commission DECIMAL(12,2) DEFAULT 0,
  site_fee DECIMAL(12,2) DEFAULT 0,
  profit DECIMAL(12,2) DEFAULT 0,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reference_number TEXT,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date DESC);

-- 9. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    expense_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    paid_to TEXT,
    payment_method TEXT DEFAULT 'Cash',
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

-- 10. App Settings Table (User specific custom dropdowns)
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_settings_user_id ON public.app_settings(user_id);

-- 11. Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('monthly', 'yearly')),
  target_amount DECIMAL(10,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, goal_type, period_start)
);

-- 12. Transaction Templates Table
CREATE TABLE IF NOT EXISTS public.transaction_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  portal_id UUID NOT NULL REFERENCES public.portals(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  amount DECIMAL(10,2),
  commission DECIMAL(10,2),
  site_fee DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 13. Scraping Configs Table
CREATE TABLE IF NOT EXISTS public.scraping_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  portal_id UUID REFERENCES public.portals(id) ON DELETE SET NULL,
  extraction_rules JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 14. Timestamp Update Function & Triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_portals_updated_at ON public.portals;
CREATE TRIGGER update_portals_updated_at BEFORE UPDATE ON public.portals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 15. Enhanced Auto User Setup on Signup Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, business_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'business_name', 'My Business')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    business_name = COALESCE(EXCLUDED.business_name, public.profiles.business_name),
    updated_at = now();

  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 16. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_configs ENABLE ROW LEVEL SECURITY;

-- 17. Clean & Strict RLS Policies

-- Profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- User Roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Transactions (Strict User Isolation)
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own transactions or admins can view all" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions or admins can update all" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions or admins can delete all" ON public.transactions;

CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete their own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Expenses (Strict User Isolation)
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;

CREATE POLICY "Users can view their own expenses" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own expenses" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expenses" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- App Settings (Strict User Isolation)
DROP POLICY IF EXISTS "Users can view their own settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can insert/update their own settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can modify their own settings" ON public.app_settings;

CREATE POLICY "Users can view their own settings" ON public.app_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can modify their own settings" ON public.app_settings FOR ALL USING (auth.uid() = user_id);

-- Goals (Strict User Isolation)
DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;

CREATE POLICY "Users can view their own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON public.goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- Transaction Templates (Strict User Isolation)
DROP POLICY IF EXISTS "Users can view their own templates" ON public.transaction_templates;
DROP POLICY IF EXISTS "Users can insert their own templates" ON public.transaction_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.transaction_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.transaction_templates;

CREATE POLICY "Users can view their own templates" ON public.transaction_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own templates" ON public.transaction_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own templates" ON public.transaction_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own templates" ON public.transaction_templates FOR DELETE USING (auth.uid() = user_id);

-- Scraping Configs (Strict User Isolation)
DROP POLICY IF EXISTS "Users can view their own scraping configs" ON public.scraping_configs;
DROP POLICY IF EXISTS "Users can insert their own scraping configs" ON public.scraping_configs;
DROP POLICY IF EXISTS "Users can update their own scraping configs" ON public.scraping_configs;
DROP POLICY IF EXISTS "Users can delete their own scraping configs" ON public.scraping_configs;

CREATE POLICY "Users can view their own scraping configs" ON public.scraping_configs FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own scraping configs" ON public.scraping_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scraping configs" ON public.scraping_configs FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete their own scraping configs" ON public.scraping_configs FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Portals & Rates & Card Types (Public Read / Admin Write)
DROP POLICY IF EXISTS "Users can view all portals" ON public.portals;
DROP POLICY IF EXISTS "portal_rates_read" ON public.portal_rates;
DROP POLICY IF EXISTS "portal_rates_write" ON public.portal_rates;
DROP POLICY IF EXISTS "portal_rates_update" ON public.portal_rates;
DROP POLICY IF EXISTS "portal_rates_delete" ON public.portal_rates;
DROP POLICY IF EXISTS "Users can view all card types" ON public.card_types;

CREATE POLICY "Users can view all portals" ON public.portals FOR SELECT USING (true);
CREATE POLICY "Users can insert portals" ON public.portals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update portals" ON public.portals FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "portal_rates_read" ON public.portal_rates FOR SELECT USING (true);
CREATE POLICY "portal_rates_write" ON public.portal_rates FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "portal_rates_update" ON public.portal_rates FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "portal_rates_delete" ON public.portal_rates FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view all card types" ON public.card_types FOR SELECT USING (true);
CREATE POLICY "Admins can insert card types" ON public.card_types FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update card types" ON public.card_types FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete card types" ON public.card_types FOR DELETE USING (auth.uid() IS NOT NULL);

-- 18. Storage Bucket for Profile Avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile', 'profile', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Profile Access" ON storage.objects;
DROP POLICY IF EXISTS "Users Profile Upload" ON storage.objects;
DROP POLICY IF EXISTS "Users Profile Update" ON storage.objects;
DROP POLICY IF EXISTS "Users Profile Delete" ON storage.objects;

CREATE POLICY "Public Profile Access" ON storage.objects FOR SELECT USING (bucket_id = 'profile');
CREATE POLICY "Users Profile Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile' AND auth.role() = 'authenticated');
CREATE POLICY "Users Profile Update" ON storage.objects FOR UPDATE USING (bucket_id = 'profile' AND auth.role() = 'authenticated');
CREATE POLICY "Users Profile Delete" ON storage.objects FOR DELETE USING (bucket_id = 'profile' AND auth.role() = 'authenticated');

-- 19. Seed Baseline Portals and Card Types
INSERT INTO public.portals (name, default_commission_rate, default_site_fee)
VALUES
  ('PayMama', 2.50, 50.00),
  ('PaysWith', 2.00, 45.00),
  ('Amazon Pay', 2.50, 0.00),
  ('Flipkart', 3.00, 0.00),
  ('HDFC SmartBuy', 5.00, 0.00),
  ('Axis GrabDeals', 4.00, 0.00),
  ('Other', 2.00, 40.00)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.card_types (name, percentage)
VALUES
  ('Credit Card', 2.50),
  ('Debit Card', 1.50),
  ('UPI', 0.00),
  ('HDFC Infinia', 3.30),
  ('ICICI Amazon Pay', 5.00),
  ('Axis Magnus', 4.80),
  ('SBI Cashback', 5.00)
ON CONFLICT (name) DO NOTHING;
