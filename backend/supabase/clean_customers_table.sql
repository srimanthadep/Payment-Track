-- Clean customers table migration
-- 1. Drop unused notes column from customers
ALTER TABLE public.customers DROP COLUMN IF EXISTS notes;

-- 2. Fix unique constraint bug: NULLS NOT DISTINCT prevented multiple null-phone customers
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS uq_customers_user_phone;
DROP INDEX IF EXISTS public.uq_customers_user_phone;

-- Create partial unique index: unique phone numbers per user only when phone is not null
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_user_phone_not_null 
  ON public.customers (user_id, phone_normalized) 
  WHERE phone_normalized IS NOT NULL;

-- 3. Add integrity constraint: customer name cannot be empty
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS chk_customers_name_not_empty;
ALTER TABLE public.customers ADD CONSTRAINT chk_customers_name_not_empty CHECK (length(trim(name)) > 0);

-- 4. Canonicalize unlinked historical transaction for 'Jio Wifi Electrican'
DO $$
DECLARE
  v_customer_id uuid;
BEGIN
  INSERT INTO public.customers (user_id, name, phone, phone_normalized)
  VALUES ('98cab8fb-b582-493f-91a0-b8f3954a1366', 'Jio Wifi Electrican', NULL, NULL)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_customer_id;

  IF v_customer_id IS NULL THEN
    SELECT id INTO v_customer_id 
    FROM public.customers 
    WHERE user_id = '98cab8fb-b582-493f-91a0-b8f3954a1366' AND name = 'Jio Wifi Electrican'
    LIMIT 1;
  END IF;

  UPDATE public.transactions
  SET customer_id = v_customer_id
  WHERE id = '3a47ec4c-db55-4729-85bf-512e025f8363';
END $$;
