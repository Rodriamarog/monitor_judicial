-- Add Google Drive support to user profiles
-- This migration adds the google_drive_enabled flag and helper function for scope checking

-- Add Drive enabled flag to user profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS google_drive_enabled BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_google_drive
ON user_profiles(id) WHERE google_drive_enabled = true;

-- Add function to check if scope includes drive.file
CREATE OR REPLACE FUNCTION has_drive_scope(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_scope TEXT;
BEGIN
  SELECT scope INTO token_scope
  FROM user_google_tokens
  WHERE user_id = user_id_param;

  RETURN token_scope IS NOT NULL AND token_scope LIKE '%drive.file%';
END;
$$;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.google_drive_enabled IS 'Whether user has authorized Google Drive access for uploading documents';
COMMENT ON FUNCTION has_drive_scope(UUID) IS 'Helper function to check if user has granted Drive scope in their Google OAuth token';
