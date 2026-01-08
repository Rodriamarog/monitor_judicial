-- Migration script: Qwen3-Embedding-8B (8192 dim) -> OpenAI text-embedding-3-small (1536 dim)
-- WARNING: This will drop the tesis_embeddings table and all existing embeddings
-- You will need to re-vectorize all documents after running this migration

-- Drop the existing HNSW index
DROP INDEX IF EXISTS tesis_embeddings_vector_idx;

-- Drop the search function
DROP FUNCTION IF EXISTS search_similar_tesis(vector, float, int);

-- Drop the embeddings table (this will delete all vectorized data)
DROP TABLE IF EXISTS tesis_embeddings CASCADE;

-- Recreate the embeddings table with new dimensions
CREATE TABLE tesis_embeddings (
    id SERIAL PRIMARY KEY,
    id_tesis INTEGER NOT NULL REFERENCES tesis_documents(id_tesis) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_type TEXT,  -- 'rubro', 'hechos', 'criterio', 'justificacion', 'full'
    embedding vector(1536) NOT NULL,  -- OpenAI text-embedding-3-small dimension
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(id_tesis, chunk_index)
);

-- Recreate the HNSW index (now compatible: 1536 < 2000 dimension limit)
CREATE INDEX tesis_embeddings_vector_idx
    ON tesis_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Recreate index for filtering by thesis ID
CREATE INDEX tesis_embeddings_id_tesis_idx
    ON tesis_embeddings(id_tesis);

-- Recreate index for filtering by chunk type
CREATE INDEX tesis_embeddings_chunk_type_idx
    ON tesis_embeddings(chunk_type);

-- Recreate the search function with new dimensions
CREATE OR REPLACE FUNCTION search_similar_tesis(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id_tesis INTEGER,
    chunk_text TEXT,
    chunk_type TEXT,
    similarity FLOAT,
    rubro TEXT,
    tipo_tesis TEXT,
    materias TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id_tesis,
        e.chunk_text,
        e.chunk_type,
        1 - (e.embedding <=> query_embedding) AS similarity,
        d.rubro,
        d.tipo_tesis,
        d.materias
    FROM tesis_embeddings e
    JOIN tesis_documents d ON e.id_tesis = d.id_tesis
    WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Verify the migration
SELECT 'Migration complete!' AS status;
SELECT 'Run vectorize_tesis.py to re-generate embeddings with OpenAI model' AS next_step;
