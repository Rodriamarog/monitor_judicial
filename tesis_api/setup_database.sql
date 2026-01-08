-- Setup script for RAG vectorization database
-- Database: MJ_TesisYJurisprudencias

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for storing full thesis documents
CREATE TABLE IF NOT EXISTS tesis_documents (
    id_tesis INTEGER PRIMARY KEY,
    rubro TEXT NOT NULL,
    texto TEXT NOT NULL,
    precedentes TEXT,
    epoca TEXT,
    instancia TEXT,
    organo_juris TEXT,
    fuente TEXT,
    tesis TEXT,
    tipo_tesis TEXT,
    localizacion TEXT,
    anio INTEGER,
    mes TEXT,
    nota_publica TEXT,
    anexos TEXT,
    huella_digital TEXT,
    materias TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create table for storing vector embeddings
CREATE TABLE IF NOT EXISTS tesis_embeddings (
    id SERIAL PRIMARY KEY,
    id_tesis INTEGER NOT NULL REFERENCES tesis_documents(id_tesis) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_type TEXT,  -- 'rubro', 'hechos', 'criterio', 'justificacion', 'full'
    embedding vector(1536) NOT NULL,  -- OpenAI text-embedding-3-small dimension
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(id_tesis, chunk_index)
);

-- Create indexes for efficient similarity search
-- HNSW index supports up to 2000 dimensions (1536 < 2000 ✓)
CREATE INDEX IF NOT EXISTS tesis_embeddings_vector_idx
    ON tesis_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Create index for filtering by thesis ID
CREATE INDEX IF NOT EXISTS tesis_embeddings_id_tesis_idx 
    ON tesis_embeddings(id_tesis);

-- Create index for filtering by chunk type
CREATE INDEX IF NOT EXISTS tesis_embeddings_chunk_type_idx 
    ON tesis_embeddings(chunk_type);

-- Create index for filtering by materias
CREATE INDEX IF NOT EXISTS tesis_documents_materias_idx 
    ON tesis_documents USING GIN(materias);

-- Create index for filtering by year
CREATE INDEX IF NOT EXISTS tesis_documents_anio_idx 
    ON tesis_documents(anio);

-- Create index for filtering by tipo_tesis
CREATE INDEX IF NOT EXISTS tesis_documents_tipo_tesis_idx 
    ON tesis_documents(tipo_tesis);

-- Function to search for similar embeddings with flexible filtering
CREATE OR REPLACE FUNCTION search_similar_tesis(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    filter_materias TEXT[] DEFAULT NULL,
    filter_tipo_tesis TEXT DEFAULT NULL,
    filter_epoca TEXT DEFAULT NULL,
    filter_anio_min INTEGER DEFAULT NULL,
    filter_anio_max INTEGER DEFAULT NULL,
    filter_instancia TEXT DEFAULT NULL
)
RETURNS TABLE (
    id_tesis INTEGER,
    chunk_text TEXT,
    chunk_type TEXT,
    chunk_index INTEGER,
    similarity FLOAT,
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
    SELECT
        e.id_tesis,
        e.chunk_text,
        e.chunk_type,
        e.chunk_index,
        1 - (e.embedding <=> query_embedding) AS similarity,
        d.rubro,
        d.texto,
        d.tipo_tesis,
        d.epoca,
        d.instancia,
        d.anio,
        d.materias
    FROM tesis_embeddings e
    JOIN tesis_documents d ON e.id_tesis = d.id_tesis
    WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
        AND (filter_materias IS NULL OR d.materias && filter_materias)
        AND (filter_tipo_tesis IS NULL OR d.tipo_tesis = filter_tipo_tesis)
        AND (filter_epoca IS NULL OR d.epoca = filter_epoca)
        AND (filter_anio_min IS NULL OR d.anio >= filter_anio_min)
        AND (filter_anio_max IS NULL OR d.anio <= filter_anio_max)
        AND (filter_instancia IS NULL OR d.instancia = filter_instancia)
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

COMMENT ON TABLE tesis_documents IS 'Stores full thesis documents with metadata';
COMMENT ON TABLE tesis_embeddings IS 'Stores vector embeddings for semantic search';
COMMENT ON FUNCTION search_similar_tesis IS 'Searches for similar thesis chunks using cosine similarity';
