-- Fix permissions for Vault RPC functions
-- Simpler approach: just grant access to vault schema and tables

-- Grant usage on vault schema to postgres
GRANT USAGE ON SCHEMA vault TO postgres;

-- Grant access to vault tables
GRANT ALL ON ALL TABLES IN SCHEMA vault TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA vault TO postgres;

-- Make sure our functions have proper ownership
ALTER FUNCTION vault_create_secret(TEXT, TEXT, TEXT) OWNER TO postgres;
ALTER FUNCTION vault_get_secret(UUID) OWNER TO postgres;
ALTER FUNCTION vault_delete_secret(UUID) OWNER TO postgres;

-- Set search path to include vault schema
ALTER FUNCTION vault_create_secret(TEXT, TEXT, TEXT) SET search_path = public, vault;
ALTER FUNCTION vault_get_secret(UUID) SET search_path = public, vault;
ALTER FUNCTION vault_delete_secret(UUID) SET search_path = public, vault;

-- Grant service_role access to vault schema
GRANT USAGE ON SCHEMA vault TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA vault TO service_role;
