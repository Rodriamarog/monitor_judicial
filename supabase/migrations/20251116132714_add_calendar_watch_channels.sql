-- Add calendar watch channels table for Google Calendar push notifications
-- This stores webhook channel metadata for automatic sync

CREATE TABLE IF NOT EXISTS calendar_watch_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL DEFAULT 'primary',

  -- Google channel details
  channel_id UUID NOT NULL UNIQUE, -- Our generated UUID for the channel
  resource_id TEXT NOT NULL, -- Google's opaque resource ID
  resource_uri TEXT, -- Google's resource URI
  channel_token TEXT NOT NULL, -- Verification token for webhook security

  -- Expiration tracking
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Status and activity tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'stopped')),
  last_notification_at TIMESTAMPTZ,
  notification_count INTEGER DEFAULT 0,

  -- Ensure one active channel per user per calendar
  CONSTRAINT unique_active_channel_per_calendar UNIQUE(user_id, calendar_id, status)
);

-- Enable Row Level Security
ALTER TABLE calendar_watch_channels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own channels"
  ON calendar_watch_channels FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all channels (for cron jobs and webhooks)
CREATE POLICY "Service can manage channels"
  ON calendar_watch_channels FOR ALL
  USING (true);

-- Indexes for efficient lookups
CREATE INDEX idx_channels_expiring_soon
  ON calendar_watch_channels(expires_at)
  WHERE status = 'active';

CREATE INDEX idx_channels_by_channel_id
  ON calendar_watch_channels(channel_id)
  WHERE status = 'active';

CREATE INDEX idx_channels_by_user_status
  ON calendar_watch_channels(user_id, status)
  WHERE status = 'active';

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_watch_channels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_watch_channels_updated_at
  BEFORE UPDATE ON calendar_watch_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_watch_channels_updated_at();

-- Add last_notification_at column to user_profiles for tracking webhook activity
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS google_calendar_last_notification_at TIMESTAMPTZ;

-- Comment the table and important columns
COMMENT ON TABLE calendar_watch_channels IS 'Stores Google Calendar webhook channel registrations for push notifications';
COMMENT ON COLUMN calendar_watch_channels.channel_id IS 'UUID we generate and send to Google for channel identification';
COMMENT ON COLUMN calendar_watch_channels.resource_id IS 'Opaque ID that Google returns - needed to stop the channel';
COMMENT ON COLUMN calendar_watch_channels.channel_token IS 'Random token for verifying webhook authenticity';
COMMENT ON COLUMN calendar_watch_channels.expires_at IS 'When the channel expires (max 30 days from creation)';
COMMENT ON COLUMN calendar_watch_channels.last_notification_at IS 'Last time we received a webhook notification for this channel';
