-- ==========================================================
-- AI Prediction Tracking Table for Supabase
-- Tracks user acceptance vs override of AI commission/fee predictions
-- ==========================================================

-- 1. Create the prediction_tracking table
CREATE TABLE IF NOT EXISTS public.prediction_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    commission_accepted BOOLEAN NOT NULL DEFAULT false,
    site_fee_accepted BOOLEAN NOT NULL DEFAULT false,
    both_accepted BOOLEAN NOT NULL DEFAULT false,
    predicted_commission NUMERIC(6, 2) NOT NULL DEFAULT 0,
    predicted_site_fee NUMERIC(6, 2) NOT NULL DEFAULT 0,
    actual_commission NUMERIC(6, 2) NOT NULL DEFAULT 0,
    actual_site_fee NUMERIC(6, 2) NOT NULL DEFAULT 0,
    prediction_source TEXT NOT NULL DEFAULT 'fallback',
    prediction_confidence NUMERIC(4, 3) NOT NULL DEFAULT 0,
    card_type TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    sent_to TEXT NOT NULL,
    bank_name TEXT,
    customer_mode TEXT,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) DEFAULT 0,
    profit NUMERIC(12, 2) DEFAULT 0,
    customer_name TEXT,
    customer_phone TEXT,
    portal_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for fast aggregation and queries
CREATE INDEX IF NOT EXISTS idx_prediction_tracking_user_id ON public.prediction_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_tracking_created_at ON public.prediction_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_tracking_both_accepted ON public.prediction_tracking(user_id, both_accepted);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.prediction_tracking ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for authenticated users
DROP POLICY IF EXISTS "Users can view their own prediction tracking" ON public.prediction_tracking;
CREATE POLICY "Users can view their own prediction tracking"
    ON public.prediction_tracking FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own prediction tracking" ON public.prediction_tracking;
CREATE POLICY "Users can insert their own prediction tracking"
    ON public.prediction_tracking FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own prediction tracking" ON public.prediction_tracking;
CREATE POLICY "Users can delete their own prediction tracking"
    ON public.prediction_tracking FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
