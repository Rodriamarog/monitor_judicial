-- Fix unique constraint: should be (user_id, expediente, descripcion, fecha)
-- This allows multiple documents for the same expediente over time
-- numero is just a ranking position that changes daily, not a reliable identifier

-- Drop the incorrect unique constraint
ALTER TABLE tribunal_documents
DROP CONSTRAINT IF EXISTS tribunal_documents_user_id_expediente_key;

-- Add the correct composite unique constraint
-- A document is unique by: user + case number + description + date
ALTER TABLE tribunal_documents
ADD CONSTRAINT tribunal_documents_user_expediente_desc_fecha_key
UNIQUE (user_id, expediente, descripcion, fecha);

-- Add index on expediente for querying documents by case number
CREATE INDEX IF NOT EXISTS idx_tribunal_documents_expediente
ON tribunal_documents(user_id, expediente);

-- Add index on fecha for date-based queries
CREATE INDEX IF NOT EXISTS idx_tribunal_documents_fecha
ON tribunal_documents(user_id, fecha);
