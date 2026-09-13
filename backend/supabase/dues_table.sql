-- ==========================================================
-- Dues Tracking Module: Dues Table Schema for Supabase
-- ==========================================================

-- 1. Create the dues table
CREATE TABLE IF NOT EXISTS public.dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    borrower_name TEXT NOT NULL,
    borrower_contact TEXT,
    principal_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    date_given TIMESTAMPTZ NOT NULL DEFAULT now(),
    expected_return_date TIMESTAMPTZ,
    notes TEXT,
    payments JSONB NOT NULL DEFAULT '[]'::jsonb,
    amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'outstanding',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT dues_status_check CHECK (status IN ('outstanding', 'partially_paid', 'paid', 'overdue'))
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_dues_user_id ON public.dues(user_id);
CREATE INDEX IF NOT EXISTS idx_dues_date_given ON public.dues(date_given DESC);
CREATE INDEX IF NOT EXISTS idx_dues_status ON public.dues(status);
CREATE INDEX IF NOT EXISTS idx_dues_expected_return ON public.dues(expected_return_date);

-- 3. Automatic updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_dues_updated_at ON public.dues;
CREATE TRIGGER set_dues_updated_at
    BEFORE UPDATE ON public.dues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.dues ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if any to prevent conflicts
DROP POLICY IF EXISTS "Users can view their own dues" ON public.dues;
DROP POLICY IF EXISTS "Users can insert their own dues" ON public.dues;
DROP POLICY IF EXISTS "Users can update their own dues" ON public.dues;
DROP POLICY IF EXISTS "Users can delete their own dues" ON public.dues;

-- 6. Create RLS Policies for authenticated users
CREATE POLICY "Users can view their own dues"
    ON public.dues FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dues"
    ON public.dues FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dues"
    ON public.dues FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dues"
    ON public.dues FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 7. Enable Realtime Sync for live updates
ALTER TABLE public.dues REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'dues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dues;
  END IF;
END $$;
