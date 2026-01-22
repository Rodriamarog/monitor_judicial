-- Remove Google Calendar integration while keeping standalone calendar functionality

-- Drop calendar watch channels table and related objects
DROP TABLE IF EXISTS calendar_watch_channels CASCADE;
DROP FUNCTION IF EXISTS update_watch_channels_updated_at() CASCADE;

-- Drop user_google_tokens table and related objects
DROP TABLE IF EXISTS user_google_tokens CASCADE;
DROP FUNCTION IF EXISTS update_user_google_tokens_updated_at() CASCADE;

-- Remove Google Calendar columns from user_profiles
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS google_calendar_enabled,
DROP COLUMN IF EXISTS google_calendar_sync_token,
DROP COLUMN IF EXISTS google_calendar_id,
DROP COLUMN IF EXISTS google_calendar_last_notification_at;

-- Remove Google Calendar sync columns from calendar_events
ALTER TABLE calendar_events
DROP COLUMN IF EXISTS google_calendar_id,
DROP COLUMN IF EXISTS google_event_id,
DROP COLUMN IF EXISTS ical_uid,
DROP COLUMN IF EXISTS google_etag,
DROP COLUMN IF EXISTS sync_status,
DROP COLUMN IF EXISTS sync_error,
DROP COLUMN IF EXISTS last_synced_at;

-- Drop Google Calendar specific indexes
DROP INDEX IF EXISTS idx_calendar_events_google_id;

-- Keep the following:
-- - calendar_events table (core event fields)
-- - calendar_event_id foreign key in kanban_tasks
-- - RLS policies on calendar_events
-- - update_calendar_events_updated_at trigger
-- - idx_calendar_events_user_time index
