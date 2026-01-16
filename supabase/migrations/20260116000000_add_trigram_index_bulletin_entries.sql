-- Enable pg_trgm extension for trigram-based text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on raw_text using trigram operators
-- This allows efficient ILIKE queries with leading wildcards
-- Will lock table for ~5-10 minutes but that's acceptable
-- Index size: ~2-4 GB
CREATE INDEX IF NOT EXISTS idx_bulletin_entries_raw_text_trgm
ON bulletin_entries
USING gin (raw_text gin_trgm_ops);
