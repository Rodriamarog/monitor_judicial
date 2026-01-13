-- Create juzgado_aliases table to map name variations to canonical juzgado names
-- This handles cases where the boletin judicial uses slight name variations

CREATE TABLE IF NOT EXISTS juzgado_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,

  -- Foreign key to ensure canonical_name exists in juzgados table
  CONSTRAINT fk_canonical_juzgado
    FOREIGN KEY (canonical_name)
    REFERENCES juzgados(name)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Index on alias for fast lookups during scraping
CREATE INDEX idx_juzgado_aliases_alias ON juzgado_aliases(alias);

-- Index on canonical_name for reverse lookups
CREATE INDEX idx_juzgado_aliases_canonical ON juzgado_aliases(canonical_name);

-- RLS policies
ALTER TABLE juzgado_aliases ENABLE ROW LEVEL SECURITY;

-- Public can read aliases (needed for scraper and matcher)
CREATE POLICY "Anyone can read juzgado aliases"
  ON juzgado_aliases
  FOR SELECT
  USING (true);

-- Only service role can manage aliases
CREATE POLICY "Only service role can insert juzgado aliases"
  ON juzgado_aliases
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Only service role can update juzgado aliases"
  ON juzgado_aliases
  FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Only service role can delete juzgado aliases"
  ON juzgado_aliases
  FOR DELETE
  TO service_role
  USING (true);

-- Insert the 4 known aliases
INSERT INTO juzgado_aliases (alias, canonical_name, notes) VALUES
  (
    'JUZGADO CORPORATIVO DECIMO PRIMERO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL DE TIJUANA, B.C. LISTA',
    'JUZGADO CORPORATIVO DECIMO PRIMERO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL DE TIJUANA',
    'Common variation with ", B.C. LISTA" suffix seen in bulletins'
  ),
  (
    'JUZGADO CORPORATIVO DECIMO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL DE TIJUANA, B.C. LISTA',
    'JUZGADO CORPORATIVO DECIMO CIVIL ESPECIALIZADO EN MATERIA MERCANTIL DE TIJUANA',
    'Common variation with ", B.C. LISTA" suffix seen in bulletins'
  ),
  (
    'JUZGADO QUINTO DE LO FAMILIAR DE TIJUANA, B.C. LISTA (BOLETIN) DEL',
    'JUZGADO QUINTO DE LO FAMILIAR DE TIJUANA',
    'Common variation with ", B.C. LISTA (BOLETIN) DEL" suffix seen in bulletins'
  ),
  (
    'JUZGADO ESPECIALIZADO EN VIOLENCIA CONTRA LA MUJER DE MEXICALI, DEL',
    'JUZGADO ESPECIALIZADO EN VIOLENCIA CONTRA LA MUJER DE MEXICALI',
    'Common variation with ", DEL" suffix seen in bulletins'
  )
ON CONFLICT (alias) DO NOTHING;

-- Create helper function to resolve juzgado aliases
CREATE OR REPLACE FUNCTION resolve_juzgado_alias(juzgado_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  resolved_name TEXT;
BEGIN
  -- Try to find an alias match
  SELECT canonical_name INTO resolved_name
  FROM juzgado_aliases
  WHERE alias = juzgado_name;

  -- If found, return canonical name; otherwise return original
  RETURN COALESCE(resolved_name, juzgado_name);
END;
$$;

-- Grant execute to authenticated and anon for use in queries
GRANT EXECUTE ON FUNCTION resolve_juzgado_alias(TEXT) TO authenticated, anon, service_role;

COMMENT ON TABLE juzgado_aliases IS 'Maps juzgado name variations to canonical names in the juzgados table. Used by scraper to normalize bulletin entries before insertion.';
COMMENT ON FUNCTION resolve_juzgado_alias(TEXT) IS 'Resolves a juzgado name to its canonical form if an alias exists, otherwise returns the original name.';
