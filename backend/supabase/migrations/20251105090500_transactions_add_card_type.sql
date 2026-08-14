ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS card_type TEXT NULL;


