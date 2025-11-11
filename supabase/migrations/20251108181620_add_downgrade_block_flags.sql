-- Add columns to track when a downgrade is blocked due to too many cases
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS downgrade_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS downgrade_blocked_at TIMESTAMPTZ;

-- Add index for querying blocked downgrades
CREATE INDEX IF NOT EXISTS idx_user_profiles_downgrade_blocked
ON user_profiles(downgrade_blocked)
WHERE downgrade_blocked = TRUE;
