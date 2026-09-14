-- ==============================================================================
-- Merge app_settings into profiles and drop app_settings table
-- ==============================================================================

-- 1. Add settings column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Backfill existing settings from app_settings
UPDATE public.profiles p
SET settings = COALESCE(
  (SELECT s.settings FROM public.app_settings s WHERE s.user_id = p.id LIMIT 1),
  '{}'::jsonb
);

-- 3. Drop app_settings table
DROP TABLE IF EXISTS public.app_settings CASCADE;
