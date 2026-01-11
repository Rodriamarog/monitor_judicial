-- Create RPC function to get juzgados grouped by city
-- This replaces the hardcoded JUZGADOS_BY_REGION structure

CREATE OR REPLACE FUNCTION get_juzgados_by_city()
RETURNS TABLE (
  city TEXT,
  juzgados JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(j.city, 'other') as city,
    jsonb_agg(
      jsonb_build_object(
        'id', j.id,
        'name', j.name,
        'type', j.type,
        'city', j.city
      )
      ORDER BY j.name
    ) as juzgados
  FROM juzgados j
  WHERE j.is_active = true
  GROUP BY COALESCE(j.city, 'other')
  ORDER BY
    CASE COALESCE(j.city, 'other')
      WHEN 'Tijuana' THEN 1
      WHEN 'Mexicali' THEN 2
      WHEN 'Ensenada' THEN 3
      WHEN 'Tecate' THEN 4
      WHEN 'Rosarito' THEN 5
      WHEN 'San Quintín' THEN 6
      ELSE 99
    END;
END;
$$;

-- Create RPC function to get all active juzgados (flat list)
CREATE OR REPLACE FUNCTION get_active_juzgados()
RETURNS TABLE (
  id UUID,
  name TEXT,
  city TEXT,
  type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.name,
    j.city,
    j.type
  FROM juzgados j
  WHERE j.is_active = true
  ORDER BY j.name;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_juzgados_by_city() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_active_juzgados() TO authenticated, anon;

-- Add comments
COMMENT ON FUNCTION get_juzgados_by_city() IS 'Returns active juzgados grouped by city for dropdown UI (replaces hardcoded JUZGADOS_BY_REGION)';
COMMENT ON FUNCTION get_active_juzgados() IS 'Returns all active juzgados as a flat list, sorted by name';
