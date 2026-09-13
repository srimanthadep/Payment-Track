-- ==============================================================================
-- Consolidate user_roles into profiles and drop username column
-- ==============================================================================

-- 1. Add role column to profiles with default 'user'
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL DEFAULT 'user'::public.app_role;

-- 2. Backfill existing roles from user_roles
UPDATE public.profiles p
SET role = COALESCE(
  (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = p.id LIMIT 1),
  'user'::public.app_role
);

-- 3. Update private.is_admin security definer function to check profiles.role
CREATE OR REPLACE FUNCTION private.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_uuid AND role = 'admin'
  );
$$;

-- 4. Create trigger to prevent unauthorized role escalation
CREATE OR REPLACE FUNCTION public.trg_check_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT private.is_admin((SELECT auth.uid())) THEN
      RAISE EXCEPTION 'Only administrators can modify user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_profile_role_trigger ON public.profiles;
CREATE TRIGGER check_profile_role_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_check_profile_role();

REVOKE EXECUTE ON FUNCTION public.trg_check_profile_role() FROM PUBLIC, anon, authenticated;

-- 5. Update handle_new_user to manage role on profiles directly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.profiles (id, email, full_name, business_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    extracted_fullname,
    extracted_business,
    'user'::public.app_role
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    business_name = COALESCE(EXCLUDED.business_name, public.profiles.business_name),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- 6. Update set_transaction_username to use full_name / email instead of profiles.username
CREATE OR REPLACE FUNCTION public.set_transaction_username()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    SELECT COALESCE(full_name, SPLIT_PART(email, '@', 1), 'user') INTO NEW.username
    FROM public.profiles
    WHERE id = NEW.user_id;
  END IF;
  IF NEW.username IS NULL THEN
    NEW.username := 'user';
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Drop username column from public.profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS username;

-- 8. Drop public.user_roles table
DROP TABLE IF EXISTS public.user_roles CASCADE;
