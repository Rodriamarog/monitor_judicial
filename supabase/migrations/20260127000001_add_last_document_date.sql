-- Replace last_document_numero with last_document_date
-- This provides more intuitive document tracking using dates instead of numbers

-- Drop the old numero-based column
ALTER TABLE tribunal_credentials
DROP COLUMN IF EXISTS last_document_numero;

-- Add the new date-based column
ALTER TABLE tribunal_credentials
ADD COLUMN last_document_date DATE;

-- Add index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_tribunal_documents_fecha
ON tribunal_documents(fecha);

-- Add comment explaining the change
COMMENT ON COLUMN tribunal_credentials.last_document_date IS
'Latest document date seen. Documents with dates > this value are considered new.';
