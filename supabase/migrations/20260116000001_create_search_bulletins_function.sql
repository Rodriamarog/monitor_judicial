-- Create function to search bulletins using trigram index efficiently
CREATE OR REPLACE FUNCTION search_bulletins_by_name(
    search_pattern TEXT,
    start_date DATE,
    max_results INTEGER
)
RETURNS TABLE (
    id UUID,
    bulletin_date DATE,
    juzgado TEXT,
    case_number TEXT,
    raw_text TEXT,
    bulletin_url TEXT,
    source TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Force use of trigram index by searching text first, then filtering by date
    -- This is much faster than date-first approach for name searches
    RETURN QUERY
    SELECT
        be.id,
        be.bulletin_date,
        be.juzgado,
        be.case_number,
        be.raw_text,
        be.bulletin_url,
        be.source
    FROM bulletin_entries be
    WHERE be.raw_text ILIKE search_pattern
        AND be.bulletin_date >= start_date
    ORDER BY be.bulletin_date DESC
    LIMIT max_results;
END;
$$;
