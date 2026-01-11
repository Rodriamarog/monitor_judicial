-- Create juzgados master table
-- This is the single source of truth for all valid juzgados in Baja California

CREATE TABLE IF NOT EXISTS juzgados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  state TEXT NOT NULL DEFAULT 'Baja California',
  city TEXT, -- Tijuana, Mexicali, Ensenada, etc.
  type TEXT, -- Civil, Familiar, Mercantil, Laboral, etc.
  is_active BOOLEAN DEFAULT true,
  first_seen DATE, -- When it first appeared in bulletins
  last_seen DATE, -- When it last appeared in bulletins
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_juzgados_name ON juzgados(name);
CREATE INDEX idx_juzgados_active ON juzgados(is_active);

-- RLS policies
ALTER TABLE juzgados ENABLE ROW LEVEL SECURITY;

-- Everyone can read juzgados (for dropdown)
CREATE POLICY "Public can read juzgados"
  ON juzgados FOR SELECT
  TO public
  USING (is_active = true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role can manage juzgados"
  ON juzgados FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Populate with current juzgados from bulletin_entries
-- This gives us the baseline from recent bulletins
-- Filter out trash entries (case names, amparos, exhortos, etc.)
INSERT INTO juzgados (name, first_seen, last_seen, city, type)
SELECT DISTINCT ON (juzgado)
  juzgado as name,
  MIN(bulletin_date) OVER (PARTITION BY juzgado) as first_seen,
  MAX(bulletin_date) OVER (PARTITION BY juzgado) as last_seen,
  CASE
    WHEN juzgado LIKE '%TIJUANA%' THEN 'Tijuana'
    WHEN juzgado LIKE '%MEXICALI%' THEN 'Mexicali'
    WHEN juzgado LIKE '%ENSENADA%' THEN 'Ensenada'
    WHEN juzgado LIKE '%TECATE%' THEN 'Tecate'
    WHEN juzgado LIKE '%ROSARITO%' THEN 'Rosarito'
    WHEN juzgado LIKE '%SAN QUINTIN%' THEN 'San Quintín'
    ELSE NULL
  END as city,
  CASE
    WHEN juzgado LIKE '%FAMILIAR%' THEN 'Familiar'
    WHEN juzgado LIKE '%CIVIL%' THEN 'Civil'
    WHEN juzgado LIKE '%MERCANTIL%' THEN 'Mercantil'
    WHEN juzgado LIKE '%LABORAL%' OR juzgado LIKE '%TRIBUNAL LABORAL%' THEN 'Laboral'
    WHEN juzgado LIKE '%HIPOTECARIA%' THEN 'Civil - Hipotecaria'
    WHEN juzgado LIKE '%VIOLENCIA%' THEN 'Familiar - Violencia'
    ELSE 'Otro'
  END as type
FROM bulletin_entries
WHERE juzgado NOT LIKE '%TEST%'
  AND juzgado NOT LIKE '%WEBAPP%'
  -- Filter out trash entries
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
ON CONFLICT (name) DO NOTHING;

-- Add comment
COMMENT ON TABLE juzgados IS 'Master list of all valid juzgados in Baja California. Used for dropdown in Add Case form and for detecting new/obsolete juzgados.';
