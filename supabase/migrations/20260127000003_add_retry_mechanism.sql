-- Add retry mechanism for credential validation
-- Credentials get 3 tries before being marked as 'failed'

-- Add retry_count column to track consecutive failures
ALTER TABLE tribunal_credentials
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Drop the old status check constraint
ALTER TABLE tribunal_credentials
DROP CONSTRAINT IF EXISTS tribunal_credentials_status_check;

-- Add new status check constraint including 'retry'
ALTER TABLE tribunal_credentials
ADD CONSTRAINT tribunal_credentials_status_check
CHECK (status = ANY (ARRAY['active'::text, 'retry'::text, 'failed'::text, 'inactive'::text]));

-- Add index for querying credentials that need retry
CREATE INDEX IF NOT EXISTS idx_tribunal_credentials_status
ON tribunal_credentials(status);

-- Reset any existing 'failed' credentials to allow retry
UPDATE tribunal_credentials
SET status = 'retry', retry_count = 0
WHERE status = 'failed';
