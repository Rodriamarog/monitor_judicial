-- Migration: Add case_files support to alerts table
-- Purpose: Enable Tribunal Electrónico alerts to appear in Alertas section

-- Step 1: Make bulletin_entry_id nullable (to support case_file alerts)
ALTER TABLE alerts
ALTER COLUMN bulletin_entry_id DROP NOT NULL;

-- Step 2: Add case_file_id column
ALTER TABLE alerts
ADD COLUMN case_file_id UUID REFERENCES case_files(id) ON DELETE CASCADE;

-- Step 3: Add constraint - must have either bulletin_entry_id OR case_file_id (mutually exclusive)
ALTER TABLE alerts
ADD CONSTRAINT alerts_must_have_source
CHECK (
  (bulletin_entry_id IS NOT NULL AND case_file_id IS NULL) OR
  (bulletin_entry_id IS NULL AND case_file_id IS NOT NULL)
);

-- Step 4: Add unique constraint for case_file alerts (prevent duplicates)
CREATE UNIQUE INDEX alerts_case_file_unique
ON alerts (user_id, case_file_id, monitored_case_id)
WHERE case_file_id IS NOT NULL;

-- Step 5: Add index for querying by case_file_id
CREATE INDEX idx_alerts_case_file_id ON alerts(case_file_id);

-- Add column comment for documentation
COMMENT ON COLUMN alerts.case_file_id IS
  'Reference to case_file for Tribunal Electrónico alerts. Mutually exclusive with bulletin_entry_id.';
