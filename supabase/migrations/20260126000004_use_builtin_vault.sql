-- Drop our custom vault wrapper functions and use Supabase's built-in vault functions instead
DROP FUNCTION IF EXISTS vault_create_secret(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS vault_get_secret(UUID);
DROP FUNCTION IF EXISTS vault_delete_secret(UUID);

-- Grant execute permissions on built-in vault functions to service_role
-- (These are already SECURITY DEFINER and work properly)
GRANT EXECUTE ON FUNCTION vault.create_secret(text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION vault.update_secret(uuid, text, text, text) TO service_role;

-- Check if delete function exists and grant if it does
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'vault' AND p.proname = 'delete_secret'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION vault.delete_secret(uuid) TO service_role';
  END IF;
END $$;
