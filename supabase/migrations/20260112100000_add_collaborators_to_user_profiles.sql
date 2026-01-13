-- Add collaborator fields to user_profiles table
-- Allows users on higher tiers (Pro100+) to add collaborators who receive alerts and can be assigned tasks

-- Add collaborator email and phone arrays to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS collaborator_emails JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS collaborator_phones JSONB DEFAULT '[]'::jsonb;

-- Add index for querying collaborators
CREATE INDEX IF NOT EXISTS idx_user_profiles_collaborator_emails
ON user_profiles USING GIN (collaborator_emails);

-- Add check constraints to enforce tier limits (defense in depth)
ALTER TABLE user_profiles
ADD CONSTRAINT check_collaborator_emails_array
CHECK (jsonb_typeof(collaborator_emails) = 'array'),
ADD CONSTRAINT check_collaborator_phones_array
CHECK (jsonb_typeof(collaborator_phones) = 'array');

-- Add column comments for documentation
COMMENT ON COLUMN user_profiles.collaborator_emails IS
'Array of collaborator email addresses (max 2 based on tier). Format: ["email1@example.com", "email2@example.com"]';

COMMENT ON COLUMN user_profiles.collaborator_phones IS
'Array of collaborator phone numbers with WhatsApp (max 2 based on tier). Format: ["+52 664 234 5678", "+52 664 345 6789"]';
