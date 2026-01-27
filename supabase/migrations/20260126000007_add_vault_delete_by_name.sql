-- Add function to delete vault secrets by name (for cleanup of orphaned secrets)

CREATE OR REPLACE FUNCTION public.vault_delete_secret_by_name(
  secret_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pgsodium
AS $$
BEGIN
  -- Delete from vault.secrets by name
  DELETE FROM vault.secrets
  WHERE name = secret_name;

  RETURN FOUND;
END;
$$;

-- Grant execute to service_role only
GRANT EXECUTE ON FUNCTION public.vault_delete_secret_by_name(TEXT) TO service_role;
