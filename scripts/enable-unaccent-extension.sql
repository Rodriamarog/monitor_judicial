-- Enable unaccent extension for accent-insensitive text search
-- This allows the tesis search to work with queries like "constitucion" matching "constitución"

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Test that it works
SELECT unaccent('constitución') AS test;
-- Should return: constitucion
