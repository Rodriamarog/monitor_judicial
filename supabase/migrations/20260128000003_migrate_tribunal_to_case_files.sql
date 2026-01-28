-- Step 1: Find or create monitored_cases for each tribunal document's expediente
-- This handles existing tribunal documents that might not have a monitored_case yet

WITH normalized_tribunal_docs AS (
  SELECT
    td.id,
    td.user_id,
    normalize_case_number(td.expediente) as normalized_expediente,
    td.juzgado,
    td.descripcion,
    td.fecha,
    td.pdf_storage_path,
    td.pdf_size_bytes,
    td.ai_summary,
    td.pdf_downloaded_at,
    td.created_at
  FROM tribunal_documents td
  WHERE td.pdf_storage_path IS NOT NULL  -- Only migrate if PDF exists
),
matched_or_created_cases AS (
  -- Try to find existing monitored_case
  SELECT
    ntd.*,
    mc.id as existing_case_id
  FROM normalized_tribunal_docs ntd
  LEFT JOIN monitored_cases mc ON (
    mc.user_id = ntd.user_id
    AND normalize_case_number(mc.case_number) = ntd.normalized_expediente
  )
),
-- Create monitored_cases for expedientes that don't exist yet
inserted_cases AS (
  INSERT INTO monitored_cases (user_id, case_number, juzgado, nombre, created_at)
  SELECT DISTINCT
    user_id,
    normalized_expediente,
    juzgado,
    'Tribunal Electrónico - ' || normalized_expediente,  -- Default nombre
    MIN(created_at)
  FROM matched_or_created_cases
  WHERE existing_case_id IS NULL
  GROUP BY user_id, normalized_expediente, juzgado
  ON CONFLICT (user_id, case_number, juzgado) DO NOTHING
  RETURNING id, case_number, user_id
),
-- Combine existing and newly created case IDs
all_cases AS (
  SELECT
    mocc.*,
    COALESCE(mocc.existing_case_id, ic.id) as final_case_id
  FROM matched_or_created_cases mocc
  LEFT JOIN inserted_cases ic ON (
    ic.user_id = mocc.user_id
    AND ic.case_number = mocc.normalized_expediente
  )
)
-- Step 2: Migrate to case_files
INSERT INTO case_files (
  user_id,
  case_id,
  file_name,
  file_path,
  file_size,
  mime_type,
  source,
  ai_summary,
  tribunal_descripcion,
  tribunal_fecha,
  uploaded_at,
  created_at
)
SELECT
  ac.user_id,
  ac.final_case_id,
  -- Generate filename with date for uniqueness
  ac.normalized_expediente || ' - ' ||
    SUBSTRING(ac.descripcion FROM 1 FOR 50) ||
    ' - ' || COALESCE(TO_CHAR(ac.fecha, 'YYYYMMDD'), 'sin-fecha') || '.pdf',
  ac.pdf_storage_path,
  ac.pdf_size_bytes,
  'application/pdf',
  'tribunal_electronico',
  ac.ai_summary,
  ac.descripcion,  -- Store for duplicate detection
  ac.fecha,        -- Store for duplicate detection
  COALESCE(ac.pdf_downloaded_at, ac.created_at),
  ac.created_at
FROM all_cases ac
WHERE ac.final_case_id IS NOT NULL
ON CONFLICT (case_id, tribunal_descripcion, tribunal_fecha)
  WHERE source = 'tribunal_electronico'
DO NOTHING;  -- Skip duplicates silently

-- Add comment tracking migration
COMMENT ON TABLE case_files IS
  'Unified file storage for both manual uploads and Tribunal Electrónico auto-downloads.
   Migration from tribunal_documents completed on 2026-01-28.';
