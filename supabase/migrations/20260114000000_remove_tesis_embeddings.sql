-- Migration: Remove Tesis Embeddings (Keep Raw Documents)
-- Created: 2026-01-14
-- Reason: Moving embeddings to dedicated Hetzner server
-- Impact: Semantic/AI search disabled, text search still works
-- Rollback: Can regenerate embeddings from tesis_documents if needed

-- Drop semantic search functions first (they depend on embeddings)
DROP FUNCTION IF EXISTS search_similar_tesis_fast(
  halfvec, float, int, text[], text, text, int, int, text
) CASCADE;

DROP FUNCTION IF EXISTS search_similar_tesis(
  halfvec, float, int, text[], text, text, int, int, text
) CASCADE;

-- Drop the embeddings table (CASCADE removes dependent indexes)
DROP TABLE IF EXISTS tesis_embeddings CASCADE;

-- Drop the function that finds tesis without embeddings (no longer needed)
DROP FUNCTION IF EXISTS find_tesis_without_embeddings() CASCADE;

-- Keep tesis_documents table intact (raw data preserved)
-- Keep tesis_automation_runs table (audit log preserved)

-- Document the change
COMMENT ON TABLE tesis_documents IS
  'Tesis documents (embeddings removed 2026-01-14, moved to Hetzner). ' ||
  'Text search still available via rubro/texto fields.';
