-- Ensure case_number + juzgado is unique per user
-- This prevents duplicate monitored_cases for the same expediente in same court
-- Note: Same case number can exist in different juzgados (different cases)
CREATE UNIQUE INDEX idx_monitored_cases_unique_case
ON monitored_cases (user_id, case_number, juzgado);

-- Add index for faster tribunal matching queries
CREATE INDEX idx_monitored_cases_case_number ON monitored_cases(case_number);
