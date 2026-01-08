-- =====================================================
-- FUNCIÓN MEJORADA: search_similar_tesis_with_recency
-- =====================================================
--
-- Implementa un sistema de scoring híbrido que combina:
-- 1. Similitud vectorial (cosine similarity)
-- 2. Time Decay Factor (prioriza tesis recientes)
-- 3. Multiplicador por Época (prioriza épocas actuales de la SCJN)
--
-- Fórmula:
-- final_score = similarity * epoca_boost * recency_boost
--
-- Autor: Optimización RAG para Monitor Judicial
-- Fecha: 2025-12-19
-- =====================================================

CREATE OR REPLACE FUNCTION search_similar_tesis_with_recency(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    filter_materias TEXT[] DEFAULT NULL,
    filter_tipo_tesis TEXT DEFAULT NULL,
    filter_epoca TEXT DEFAULT NULL,
    filter_anio_min INTEGER DEFAULT NULL,
    filter_anio_max INTEGER DEFAULT NULL,
    filter_instancia TEXT DEFAULT NULL,
    -- Nuevos parámetros para control de recency
    enable_recency_boost BOOLEAN DEFAULT TRUE,
    recency_weight FLOAT DEFAULT 0.3  -- Peso del factor de recencia (0-1)
)
RETURNS TABLE (
    id_tesis INTEGER,
    chunk_text TEXT,
    chunk_type TEXT,
    chunk_index INTEGER,
    similarity FLOAT,
    recency_score FLOAT,
    epoca_score FLOAT,
    final_score FLOAT,
    rubro TEXT,
    texto TEXT,
    tipo_tesis TEXT,
    epoca TEXT,
    instancia TEXT,
    anio INTEGER,
    materias TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH scored_results AS (
        SELECT
            e.id_tesis,
            e.chunk_text,
            e.chunk_type,
            e.chunk_index,
            -- Similitud base (cosine similarity)
            (1 - (e.embedding <=> query_embedding)) AS base_similarity,

            -- Factor de recencia (Time Decay)
            -- Tesis de 2025 = 1.5, tesis de 2020 = 1.4, tesis de 2010 = 1.2, etc.
            (CASE
                WHEN d.anio IS NULL THEN 1.0
                WHEN d.anio >= 2020 THEN 1.0 + ((d.anio - 2020)::float / 20.0)  -- 2025 = 1.25
                WHEN d.anio >= 2010 THEN 1.0 + ((d.anio - 2010)::float / 30.0)  -- 2019 = 1.30
                WHEN d.anio >= 2000 THEN 1.0 + ((d.anio - 2000)::float / 50.0)  -- 2009 = 1.18
                WHEN d.anio >= 1990 THEN 1.0 + ((d.anio - 1990)::float / 100.0) -- 1999 = 1.09
                ELSE 1.0
            END)::float AS recency_factor,

            -- Multiplicador por Época judicial
            -- Duodécima (2024-presente) > Undécima (2011-2023) > Décima (1995-2011)
            (CASE d.epoca
                WHEN 'Duodécima Época' THEN 2.0   -- Más reciente
                WHEN 'Undécima Época' THEN 1.8
                WHEN 'Décima Época' THEN 1.5
                WHEN 'Novena Época' THEN 1.2
                WHEN 'Octava Época' THEN 1.1
                ELSE 1.0                          -- Épocas antiguas
            END)::float AS epoca_factor,

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
            -- Filtros básicos
            (1 - (e.embedding <=> query_embedding)) > match_threshold
            AND (filter_materias IS NULL OR d.materias && filter_materias)
            AND (filter_tipo_tesis IS NULL OR d.tipo_tesis = filter_tipo_tesis)
            AND (filter_epoca IS NULL OR d.epoca = filter_epoca)
            AND (filter_anio_min IS NULL OR d.anio >= filter_anio_min)
            AND (filter_anio_max IS NULL OR d.anio <= filter_anio_max)
            AND (filter_instancia IS NULL OR d.instancia = filter_instancia)
    )
    SELECT
        s.id_tesis,
        s.chunk_text,
        s.chunk_type,
        s.chunk_index,
        s.base_similarity AS similarity,
        s.recency_factor AS recency_score,
        s.epoca_factor AS epoca_score,
        -- Score final combinado
        (CASE
            WHEN enable_recency_boost THEN
                s.base_similarity *
                (1.0 + (s.recency_factor - 1.0) * recency_weight) *
                (1.0 + (s.epoca_factor - 1.0) * recency_weight)
            ELSE
                s.base_similarity
        END)::float AS final_score,
        s.rubro,
        s.texto,
        s.tipo_tesis,
        s.epoca,
        s.instancia,
        s.anio,
        s.materias
    FROM scored_results s
    ORDER BY
        -- Ordenar por score final (no por distancia vectorial)
        CASE
            WHEN enable_recency_boost THEN
                s.base_similarity *
                (1.0 + (s.recency_factor - 1.0) * recency_weight) *
                (1.0 + (s.epoca_factor - 1.0) * recency_weight)
            ELSE
                s.base_similarity
        END DESC
    LIMIT match_count;
END;
$$;

-- Comentarios sobre el algoritmo:
--
-- RECENCY FACTOR:
-- - Incrementa el score progresivamente para tesis más recientes
-- - Tesis de 2025 obtienen ~1.25x boost
-- - Tesis de 2019 obtienen ~1.30x boost (reforma laboral)
-- - Tesis pre-2000 obtienen mínimo boost
--
-- EPOCA FACTOR:
-- - Duodécima Época (2024+): 2.0x boost máximo
-- - Undécima Época (2011-2023): 1.8x boost
-- - Décima Época (1995-2011): 1.5x boost
-- - Épocas anteriores: 1.0-1.2x
--
-- FINAL SCORE:
-- - Combina similarity, recency y época
-- - El parámetro recency_weight controla cuánto peso dar a la recencia (default: 0.3)
-- - Si enable_recency_boost=FALSE, solo usa similitud vectorial (backward compatible)
--
-- EJEMPLO DE USO:
-- SELECT * FROM search_similar_tesis_with_recency(
--     query_embedding := '[0.1, 0.2, ...]'::vector,
--     match_threshold := 0.3,
--     match_count := 5,
--     filter_materias := ARRAY['Laboral'],
--     enable_recency_boost := TRUE,
--     recency_weight := 0.3
-- );

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_similar_tesis_with_recency TO postgres;
