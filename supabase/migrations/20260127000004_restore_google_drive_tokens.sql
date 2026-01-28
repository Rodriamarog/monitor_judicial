-- Restore user_google_tokens table for Google Drive integration
-- (Calendar integration was removed but Drive is still needed for document upload)

CREATE TABLE IF NOT EXISTS user_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one token set per user
  UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_user_google_tokens_user_id ON user_google_tokens(user_id);

-- Enable Row Level Security
ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own tokens
CREATE POLICY "Users can view their own tokens"
  ON user_google_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
  ON user_google_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
  ON user_google_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON user_google_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_google_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER user_google_tokens_updated_at
  BEFORE UPDATE ON user_google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_user_google_tokens_updated_at();

-- Table comment
COMMENT ON TABLE user_google_tokens IS 'Stores Google OAuth tokens for Drive integration';
