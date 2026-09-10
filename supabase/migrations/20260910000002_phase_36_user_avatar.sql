-- Phase 36: User Avatar Support
-- Add avatar_url column to user_profiles and storage policies for ucis-bucket

-- Add avatar_url column
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Make ucis-bucket public for read access
UPDATE storage.buckets SET public = true WHERE id = 'ucis-bucket';

-- Drop existing policies on ucis-bucket to avoid conflicts
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Allow authenticated users to upload to avatars folder
CREATE POLICY "Authenticated upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ucis-bucket'
);

-- Allow authenticated users to update their own files
CREATE POLICY "Authenticated update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ucis-bucket'
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Authenticated delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ucis-bucket'
);
