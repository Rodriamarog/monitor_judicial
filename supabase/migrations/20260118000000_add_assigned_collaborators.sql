-- Migration: Add assigned_collaborators column to monitored_cases and monitored_names
-- Purpose: Allow selective email notifications for specific collaborators per case/name
-- Default: Empty array [] means only owner receives notifications

-- Add assigned_collaborators column to monitored_cases
ALTER TABLE monitored_cases
ADD COLUMN IF NOT EXISTS assigned_collaborators JSONB DEFAULT '[]'::jsonb;

-- Add assigned_collaborators column to monitored_names
ALTER TABLE monitored_names
ADD COLUMN IF NOT EXISTS assigned_collaborators JSONB DEFAULT '[]'::jsonb;

-- Add GIN indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_monitored_cases_assigned_collaborators
ON monitored_cases USING GIN (assigned_collaborators);

CREATE INDEX IF NOT EXISTS idx_monitored_names_assigned_collaborators
ON monitored_names USING GIN (assigned_collaborators);

-- Add check constraints to ensure valid JSON array format
ALTER TABLE monitored_cases
ADD CONSTRAINT IF NOT EXISTS check_assigned_collaborators_array
CHECK (jsonb_typeof(assigned_collaborators) = 'array');

ALTER TABLE monitored_names
ADD CONSTRAINT IF NOT EXISTS check_assigned_collaborators_array
CHECK (jsonb_typeof(assigned_collaborators) = 'array');

-- Add column comments for documentation
COMMENT ON COLUMN monitored_cases.assigned_collaborators IS
'Array of collaborator emails who should receive alerts for this case. Format: ["email1@example.com", "email2@example.com"]. Empty array means only owner receives alerts.';

COMMENT ON COLUMN monitored_names.assigned_collaborators IS
'Array of collaborator emails who should receive alerts for this name. Format: ["email1@example.com", "email2@example.com"]. Empty array means only owner receives alerts.';
