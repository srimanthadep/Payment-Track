-- Update profit calculation: site fee should NOT be subtracted from commission
-- Change generated column to equal commission directly

DO $$ BEGIN
  -- If profit column exists, drop it and recreate as generated from commission
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'profit'
  ) THEN
    ALTER TABLE public.transactions DROP COLUMN profit;
  END IF;
END $$;

ALTER TABLE public.transactions
  ADD COLUMN profit DECIMAL(10,2) GENERATED ALWAYS AS (commission) STORED;


