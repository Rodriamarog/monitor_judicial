-- Add Google Calendar support to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS google_calendar_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS google_calendar_sync_token TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;

-- Create table for storing Google OAuth tokens
CREATE TABLE IF NOT EXISTS user_google_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_google_tokens
ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY "Users can view own tokens"
  ON user_google_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON user_google_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON user_google_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON user_google_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create table for calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,

  -- Google Calendar mapping
  google_calendar_id TEXT,
  google_event_id TEXT,
  ical_uid TEXT,
  google_etag TEXT,

  -- Sync state
  sync_status TEXT DEFAULT 'pending', -- pending, synced, error
  sync_error TEXT,
  last_synced_at TIMESTAMPTZ,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure we don't duplicate Google events
  UNIQUE(user_id, google_calendar_id, google_event_id)
);

-- Enable RLS on calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can only access their own events
CREATE POLICY "Users can view own events"
  ON calendar_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON calendar_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON calendar_events
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON calendar_events
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for efficient event queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_time
  ON calendar_events(user_id, start_time, end_time)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id
  ON calendar_events(google_calendar_id, google_event_id)
  WHERE deleted_at IS NULL;

-- Create updated_at trigger for user_google_tokens
CREATE OR REPLACE FUNCTION update_user_google_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_google_tokens_updated_at
  BEFORE UPDATE ON user_google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_user_google_tokens_updated_at();

-- Create updated_at trigger for calendar_events
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();
