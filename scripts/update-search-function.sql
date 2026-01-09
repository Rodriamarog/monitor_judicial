-- Update search_similar_tesis function to use halfvec(256) embeddings

CREATE OR REPLACE FUNCTION search_similar_tesis(
    query_embedding halfvec(256),
    match_threshold DOUBLE PRECISION DEFAULT 0.5,
    match_count INT DEFAULT 10,
    filter_materias TEXT[] DEFAULT NULL,
    filter_tipo_tesis TEXT DEFAULT NULL,
    filter_epoca TEXT DEFAULT NULL,
    filter_anio_min INT DEFAULT NULL,
    filter_anio_max INT DEFAULT NULL,
    filter_instancia TEXT DEFAULT NULL
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
        1 - (e.embedding_reduced <=> query_embedding) AS similarity,
        d.rubro,
        d.texto,
        d.tipo_tesis,
        d.epoca,
        d.instancia,
        d.anio,
        d.materias
    FROM tesis_embeddings e
    JOIN tesis_documents d ON e.id_tesis = d.id_tesis
    WHERE 1 - (e.embedding_reduced <=> query_embedding) > match_threshold
        AND (filter_materias IS NULL OR d.materias && filter_materias)
        AND (filter_tipo_tesis IS NULL OR d.tipo_tesis = filter_tipo_tesis)
        AND (filter_epoca IS NULL OR d.epoca = filter_epoca)
        AND (filter_anio_min IS NULL OR d.anio >= filter_anio_min)
        AND (filter_anio_max IS NULL OR d.anio <= filter_anio_max)
        AND (filter_instancia IS NULL OR d.instancia = filter_instancia)
    ORDER BY e.embedding_reduced <=> query_embedding
    LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_similar_tesis IS
'Search similar tesis using halfvec(256) embeddings for memory efficiency';
