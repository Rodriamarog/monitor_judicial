-- Update RPC function to use halfvec(256) embeddings

CREATE OR REPLACE FUNCTION search_similar_tesis_fast(
  query_embedding halfvec(256),
  match_count INT DEFAULT 50,
  filter_materias TEXT[] DEFAULT NULL,
  filter_tipo_tesis TEXT DEFAULT NULL,
  filter_anio_min INT DEFAULT NULL,
  filter_anio_max INT DEFAULT NULL
)
RETURNS TABLE (
  id_tesis INT,
  chunk_text TEXT,
  chunk_type TEXT,
  chunk_index INT,
  similarity DOUBLE PRECISION,
  rubro TEXT,
  texto TEXT,
  tipo_tesis TEXT,
  epoca TEXT,
  instancia TEXT,
  anio INT,
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
        e.chunk_index,
        (1 - (e.embedding_reduced <=> query_embedding))::double precision AS similarity,
        d.rubro,
        d.texto,
        d.tipo_tesis,
        d.epoca,
        d.instancia,
        d.anio,
        d.materias
    FROM tesis_embeddings e
    JOIN tesis_documents d ON e.id_tesis = d.id_tesis
    WHERE
        (filter_materias IS NULL OR d.materias && filter_materias)
        AND (filter_tipo_tesis IS NULL OR d.tipo_tesis = filter_tipo_tesis)
        AND (filter_anio_min IS NULL OR d.anio >= filter_anio_min)
        AND (filter_anio_max IS NULL OR d.anio <= filter_anio_max)
    ORDER BY e.embedding_reduced <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION search_similar_tesis_fast IS
'Fast vector similarity search using halfvec(256) embeddings with HNSW index. Fits in 1GB RAM.';
