-- Create IVFFlat index on reduced embeddings
-- With Micro compute (1GB RAM), only ~200-300 MB available for vectors
-- IVFFlat: ~332MB data + ~10-20MB index = ~350MB (fits!)
-- HNSW: ~332MB data + ~660MB index = ~1GB (doesn't fit)

-- Drop old index if exists
DROP INDEX IF EXISTS tesis_embeddings_embedding_idx;
DROP INDEX IF EXISTS tesis_embeddings_embedding_reduced_idx;

-- Create IVFFlat index on embedding_reduced
-- lists = sqrt(648766) ≈ 805, round to 1000 for better performance
-- This will take ~2-5 minutes to build
CREATE INDEX CONCURRENTLY tesis_embeddings_embedding_reduced_idx
ON tesis_embeddings
USING ivfflat (embedding_reduced halfvec_cosine_ops)
WITH (lists = 1000);

-- Analyze table for query planner
ANALYZE tesis_embeddings;

-- Verify index was created and get stats
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname = 'tesis_embeddings_embedding_reduced_idx';

-- Check index usage (will show 0 until first queries)
SELECT
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexrelname = 'tesis_embeddings_embedding_reduced_idx';
