-- Supabase Storage Configuration for Profile Pictures
-- Bucket name: 'profile'

-- 1. Ensure 'profile' storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile', 'profile', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow public viewing of profile photos
CREATE POLICY "Public profile photos are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile');

-- 3. Allow authenticated users to upload avatar images into profile bucket
CREATE POLICY "Users can upload their own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile');

-- 4. Allow authenticated users to update/overwrite their profile photos
CREATE POLICY "Users can update their profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile');

-- 5. Allow authenticated users to delete their profile photos
CREATE POLICY "Users can delete their profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile');
