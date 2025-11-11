-- Add optional client phone field to monitored_cases table
-- For user convenience in tracking which client is associated with each case

ALTER TABLE monitored_cases
ADD COLUMN telefono VARCHAR(20);

-- Add comment to document the field purpose
COMMENT ON COLUMN monitored_cases.telefono IS 'Optional client phone number for user reference (not used in matching)';
