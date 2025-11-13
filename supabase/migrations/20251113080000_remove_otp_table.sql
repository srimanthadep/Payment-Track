-- Remove OTP verifications table as phone authentication has been removed
DROP TABLE IF EXISTS otp_verifications;

-- Remove phone_number column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_number;
