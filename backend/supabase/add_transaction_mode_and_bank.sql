-- ==============================================================================
-- Migration: Add customer_mode and bank_name to public.transactions
-- ==============================================================================

-- 1. Add customer_mode column (Online / Offline)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS customer_mode text DEFAULT 'Offline';

-- 2. Add bank_name column (e.g. HDFC Bank, SBI Card, ICICI Bank, etc.)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS bank_name text;

-- 3. Create indices for performance on analytical queries
CREATE INDEX IF NOT EXISTS idx_transactions_customer_mode ON public.transactions(customer_mode);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_name ON public.transactions(bank_name);

COMMENT ON COLUMN public.transactions.customer_mode IS 'Transaction channel: Online or Offline';
COMMENT ON COLUMN public.transactions.bank_name IS 'Bank of the card used for the transaction';
