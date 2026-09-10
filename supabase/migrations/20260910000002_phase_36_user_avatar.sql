-- Phase 36: User Avatar Support
-- Add avatar_url column to user_profiles and storage policies for ucis-bucket

-- Add avatar_url column
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Make ucis-bucket PRIVATE (not public)
UPDATE storage.buckets SET public = false WHERE id = 'ucis-bucket';

-- Drop ALL existing policies on ucis-bucket to avoid conflicts
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

DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated upload avatars" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated update avatars" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated delete avatars" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Avatar authenticated read" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Avatar owner insert" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Avatar owner update" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Avatar owner delete" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Policy 1: All authenticated users can READ avatars
CREATE POLICY "Avatar authenticated read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ucis-bucket'
  AND (storage.foldername(name))[0] = 'avatars'
);

-- Policy 2: Owner can INSERT (upload) their own avatars
CREATE POLICY "Avatar owner insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ucis-bucket'
  AND (storage.foldername(name))[0] = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Owner can UPDATE their own avatars
CREATE POLICY "Avatar owner update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ucis-bucket'
  AND (storage.foldername(name))[0] = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Owner can DELETE their own avatars
CREATE POLICY "Avatar owner delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ucis-bucket'
  AND (storage.foldername(name))[0] = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
