-- Fix permissions for Vault RPC functions
-- Grant necessary permissions to use pgsodium crypto functions

-- Grant usage on pgsodium schema to postgres role
GRANT USAGE ON SCHEMA pgsodium TO postgres;

-- Grant execute on pgsodium functions needed by vault
GRANT EXECUTE ON FUNCTION pgsodium.crypto_aead_det_encrypt(bytea, bytea, uuid, bytea) TO postgres;
GRANT EXECUTE ON FUNCTION pgsodium.crypto_aead_det_decrypt(bytea, bytea, uuid, bytea) TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgsodium TO postgres;

-- Grant usage on vault schema
GRANT USAGE ON SCHEMA vault TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA vault TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA vault TO postgres;

-- Ensure the functions are owned by postgres and set search_path
ALTER FUNCTION vault_create_secret(TEXT, TEXT, TEXT) OWNER TO postgres;
ALTER FUNCTION vault_get_secret(UUID) OWNER TO postgres;
ALTER FUNCTION vault_delete_secret(UUID) OWNER TO postgres;

-- Set search path to include pgsodium and vault
ALTER FUNCTION vault_create_secret(TEXT, TEXT, TEXT) SET search_path = public, vault, pgsodium;
ALTER FUNCTION vault_get_secret(UUID) SET search_path = public, vault, pgsodium;
ALTER FUNCTION vault_delete_secret(UUID) SET search_path = public, vault, pgsodium;
