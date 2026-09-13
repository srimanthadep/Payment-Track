-- 1. Normalize all existing customer phone numbers directly
UPDATE public.customers
SET phone = CASE 
  WHEN length(regexp_replace(phone, '\D', '', 'g')) = 12 AND regexp_replace(phone, '\D', '', 'g') LIKE '91%' THEN substr(regexp_replace(phone, '\D', '', 'g'), 3)
  WHEN length(regexp_replace(phone, '\D', '', 'g')) = 11 AND regexp_replace(phone, '\D', '', 'g') LIKE '0%' THEN substr(regexp_replace(phone, '\D', '', 'g'), 2)
  ELSE NULLIF(regexp_replace(phone, '\D', '', 'g'), '')
END
WHERE phone IS NOT NULL;

-- 2. Drop indexes on phone_normalized
DROP INDEX IF EXISTS public.uq_customers_user_phone_not_null;
DROP INDEX IF EXISTS public.idx_customers_phone_normalized;

-- 3. Drop phone_normalized column
ALTER TABLE public.customers DROP COLUMN IF EXISTS phone_normalized;

-- 4. Create partial unique index on phone directly
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_user_phone 
  ON public.customers (user_id, phone) 
  WHERE phone IS NOT NULL;
