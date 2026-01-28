-- Function to normalize expediente/case numbers
-- Strips "EXPEDIENTE " prefix and pads first number to 5 digits
-- Examples:
--   "EXPEDIENTE 1234/2025" → "01234/2025"
--   "1234/2025" → "01234/2025"
--   "  123/24-CV  " → "00123/24-CV"
CREATE OR REPLACE FUNCTION normalize_case_number(case_num TEXT)
RETURNS TEXT AS $$
DECLARE
  trimmed TEXT;
  first_part TEXT;
  second_part TEXT;
  suffix TEXT;
BEGIN
  -- Trim and uppercase
  trimmed := UPPER(TRIM(case_num));

  -- Strip "EXPEDIENTE " prefix if present
  trimmed := REGEXP_REPLACE(trimmed, '^EXPEDIENTE\s+', '');

  -- Extract pattern: digits/digits with optional suffix like -CV, -MP
  IF trimmed ~ '^\d+/\d+(-[A-Z]+)?$' THEN
    -- Extract first part (before /)
    first_part := substring(trimmed from '^\d+');

    -- Extract second part (after / before suffix)
    second_part := substring(trimmed from '/(\d+)');

    -- Extract suffix if exists
    suffix := COALESCE(substring(trimmed from '(-[A-Z]+)$'), '');

    -- Pad first part to 5 digits
    RETURN lpad(first_part, 5, '0') || '/' || second_part || suffix;
  ELSE
    -- Can't parse, return as-is
    RETURN trimmed;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Normalize all existing case numbers in monitored_cases
UPDATE monitored_cases
SET case_number = normalize_case_number(case_number)
WHERE case_number ~ '^\d+/\d+';

-- Normalize all existing expedientes in tribunal_documents
UPDATE tribunal_documents
SET expediente = normalize_case_number(expediente)
WHERE expediente ~ '^\d+/\d+';
