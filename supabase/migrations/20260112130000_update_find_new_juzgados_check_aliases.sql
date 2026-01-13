-- Update find_new_juzgados function to exclude known aliases
-- This prevents alerting admins about juzgados that are already mapped as aliases

CREATE OR REPLACE FUNCTION find_new_juzgados()
RETURNS TABLE (
  name TEXT,
  first_seen DATE,
  last_seen DATE,
  appearance_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    be.juzgado::TEXT as name,
    MIN(be.bulletin_date)::DATE as first_seen,
    MAX(be.bulletin_date)::DATE as last_seen,
    COUNT(*)::BIGINT as appearance_count
  FROM (
    -- Get unique clean juzgados from bulletin_entries
    SELECT DISTINCT juzgado
    FROM bulletin_entries
    WHERE juzgado NOT LIKE '%TEST%'
      AND juzgado NOT LIKE '%WEBAPP%'
      -- Filter out trash entries (case names, amparos, exhortos, etc.)
      AND juzgado NOT LIKE '%VS.%'
      AND juzgado NOT LIKE '%PROMOVIDO%'
      AND juzgado NOT LIKE '%AMPARO%'
      AND juzgado NOT LIKE '%EXHORTO%'
      AND juzgado NOT LIKE '%CUADERNO%'
      AND juzgado NOT LIKE '%REQUISITORIA%'
      AND juzgado NOT LIKE 'DÉCIMO%'
      AND juzgado NOT LIKE '%RECURSO DE QUEJA%'
      -- Only include proper juzgado names
      AND (juzgado LIKE 'JUZGADO%' OR juzgado LIKE 'TRIBUNAL%' OR juzgado LIKE 'H. TRIBUNAL%')
  ) clean_bulletins
  JOIN bulletin_entries be ON be.juzgado = clean_bulletins.juzgado
  LEFT JOIN juzgados j ON j.name = clean_bulletins.juzgado
  LEFT JOIN juzgado_aliases ja ON ja.alias = clean_bulletins.juzgado
  WHERE j.name IS NULL  -- Not in juzgados table
    AND ja.alias IS NULL  -- Not a known alias
  GROUP BY be.juzgado
  ORDER BY appearance_count DESC;
END;
$$;

COMMENT ON FUNCTION find_new_juzgados() IS 'Finds juzgados appearing in bulletin_entries that are not in the juzgados table and not known aliases. Used by daily cron job to alert admin of new courts that need review.';
