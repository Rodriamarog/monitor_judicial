-- Create baseline table to track historical documents at credential setup time
-- This prevents alert spam for documents that already existed before monitoring

CREATE TABLE tribunal_baseline (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Document identification (normalized to match case_files)
  expediente VARCHAR(100) NOT NULL,
  juzgado VARCHAR(255) NOT NULL,
  descripcion TEXT NOT NULL,
  fecha DATE,

  -- Metadata
  baseline_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one entry per document per user
  CONSTRAINT tribunal_baseline_unique
    UNIQUE (user_id, expediente, juzgado, descripcion, fecha)
);

-- Indexes for efficient lookups
CREATE INDEX idx_tribunal_baseline_user_id ON tribunal_baseline(user_id);
CREATE INDEX idx_tribunal_baseline_expediente ON tribunal_baseline(expediente);
CREATE INDEX idx_tribunal_baseline_lookup
  ON tribunal_baseline(user_id, expediente, juzgado, descripcion, fecha);

-- Row-level security
ALTER TABLE tribunal_baseline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own baseline"
  ON tribunal_baseline FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own baseline"
  ON tribunal_baseline FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own baseline"
  ON tribunal_baseline FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE tribunal_baseline IS
  'Baseline snapshot of all tribunal documents at credential setup time.
   Used to distinguish historical documents from new changes.
   Created during credential validation, checked during daily sync.
   Only documents added AFTER baseline creation will trigger alerts.';
