-- Add source column to distinguish manual uploads vs TE auto-downloads
ALTER TABLE case_files
ADD COLUMN source TEXT DEFAULT 'manual_upload'
  CHECK (source IN ('manual_upload', 'tribunal_electronico'));

-- Add AI summary for TE documents
ALTER TABLE case_files
ADD COLUMN ai_summary TEXT;

-- Add tribunal-specific metadata for duplicate detection
-- These fields are ONLY populated for source='tribunal_electronico'
ALTER TABLE case_files
ADD COLUMN tribunal_descripcion TEXT,
ADD COLUMN tribunal_fecha DATE;

-- Create unique index to prevent duplicate TE documents
-- Key: case_id + descripcion + fecha (NOT numero - it changes daily)
CREATE UNIQUE INDEX idx_case_files_tribunal_unique
ON case_files (case_id, tribunal_descripcion, tribunal_fecha)
WHERE source = 'tribunal_electronico';

-- Add index for faster queries
CREATE INDEX idx_case_files_source ON case_files(source);

-- Add comment for clarity
COMMENT ON COLUMN case_files.source IS
  'Source of file: manual_upload (user uploaded) or tribunal_electronico (auto-downloaded)';
COMMENT ON COLUMN case_files.tribunal_descripcion IS
  'Tribunal document description - used for duplicate detection';
COMMENT ON COLUMN case_files.tribunal_fecha IS
  'Tribunal document date - used for duplicate detection';
