/*
  # Make Storage Buckets Public

  1. Changes
    - Update chat-images bucket to be public
    - Update chat-videos bucket to be public
    - Update chat-voice bucket to be public
    - Update chat-files bucket to be public
    - Create profile-photos bucket for user profile pictures

  2. Security
    - Buckets are public for read access
    - Upload/delete still requires authentication via RLS policies
*/

UPDATE storage.buckets SET public = true WHERE name = 'chat-images';
UPDATE storage.buckets SET public = true WHERE name = 'chat-videos';
UPDATE storage.buckets SET public = true WHERE name = 'chat-voice';
UPDATE storage.buckets SET public = true WHERE name = 'chat-files';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can upload their own profile photo'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Users can upload their own profile photo"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'profile-photos' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update their own profile photo'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Users can update their own profile photo"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'profile-photos' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete their own profile photo'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Users can delete their own profile photo"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'profile-photos' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Anyone can view profile photos'
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Anyone can view profile photos"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'profile-photos');
  END IF;
END $$;
