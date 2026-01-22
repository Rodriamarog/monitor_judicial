-- Add timezone column to user_profiles
-- Default to America/Tijuana (Baja California, Mexico timezone)

ALTER TABLE user_profiles
ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/Tijuana' NOT NULL;

-- Add constraint to ensure valid timezone strings
ALTER TABLE user_profiles
ADD CONSTRAINT valid_timezone CHECK (
  timezone IN (
    -- Mexico timezones
    'America/Tijuana',        -- Baja California (UTC-8/UTC-7)
    'America/Mexico_City',    -- Most of Mexico (UTC-6/UTC-5)
    'America/Cancun',         -- Quintana Roo (UTC-5, no DST)
    'America/Hermosillo',     -- Sonora (UTC-7, no DST)
    'America/Chihuahua',      -- Chihuahua (UTC-7/UTC-6)
    'America/Mazatlan',       -- Sinaloa, Nayarit (UTC-7/UTC-6)
    'America/Monterrey',      -- Nuevo León (UTC-6/UTC-5)
    -- US timezones (for cross-border cases)
    'America/Los_Angeles',    -- Pacific Time (UTC-8/UTC-7)
    'America/Phoenix',        -- Arizona (UTC-7, no DST)
    'America/Denver',         -- Mountain Time (UTC-7/UTC-6)
    'America/Chicago',        -- Central Time (UTC-6/UTC-5)
    'America/New_York'        -- Eastern Time (UTC-5/UTC-4)
  )
);

-- Update existing users to use Tijuana timezone (default)
UPDATE user_profiles
SET timezone = 'America/Tijuana'
WHERE timezone IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.timezone IS 'IANA timezone identifier for the user. Used to correctly interpret event times and display calendar in user''s local timezone. Defaults to America/Tijuana for Baja California, Mexico.';
