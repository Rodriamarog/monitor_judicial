-- Create GIN indexes for fast text search with unaccent
-- This will make text searches go from 18+ seconds to <100ms

-- Create index on rubro (title) for fast text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS tesis_documents_rubro_unaccent_idx
ON tesis_documents
USING gin (unaccent(rubro) gin_trgm_ops);

-- Create index on texto (full text) for fast text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS tesis_documents_texto_unaccent_idx
ON tesis_documents
USING gin (unaccent(texto) gin_trgm_ops);

-- Note: CONCURRENTLY allows index creation without blocking other queries
-- Note: gin_trgm_ops requires pg_trgm extension (for trigram matching with ILIKE)
