-- Drop our custom vault wrapper functions and use Supabase's built-in vault functions instead
DROP FUNCTION IF EXISTS vault_create_secret(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS vault_get_secret(UUID);
DROP FUNCTION IF EXISTS vault_delete_secret(UUID);

-- Grant execute permissions on built-in vault functions to service_role
GRANT EXECUTE ON FUNCTION vault.create_secret(text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION vault.update_secret(uuid, text, text, text, uuid) TO service_role;

-- Grant access to vault tables for deletion
GRANT SELECT, DELETE ON vault.secrets TO service_role;
