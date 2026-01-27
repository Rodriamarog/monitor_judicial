-- Create public wrapper functions for vault operations
-- These are accessible through the REST API and call the vault schema functions internally

-- Wrapper to create a secret in Vault
CREATE OR REPLACE FUNCTION public.vault_create_secret(
  secret_value TEXT,
  secret_name TEXT DEFAULT NULL,
  secret_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pgsodium
AS $$
DECLARE
  secret_id UUID;
BEGIN
  -- Call vault.create_secret
  SELECT vault.create_secret(
    secret_value,
    secret_name,
    secret_description
  ) INTO secret_id;

  RETURN secret_id;
END;
$$;

-- Wrapper to get a secret from Vault
CREATE OR REPLACE FUNCTION public.vault_get_secret(
  secret_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pgsodium
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  -- Retrieve from decrypted_secrets view
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE id = secret_id;

  RETURN secret_value;
END;
$$;

-- Wrapper to delete a secret from Vault
CREATE OR REPLACE FUNCTION public.vault_delete_secret(
  secret_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pgsodium
AS $$
BEGIN
  -- Delete from vault.secrets
  DELETE FROM vault.secrets
  WHERE id = secret_id;

  RETURN FOUND;
END;
$$;

-- Grant execute to service_role only (these are sensitive operations)
GRANT EXECUTE ON FUNCTION public.vault_create_secret(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.vault_get_secret(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.vault_delete_secret(UUID) TO service_role;

-- Also grant to authenticated for the get function (users might need to read their own secrets)
GRANT EXECUTE ON FUNCTION public.vault_get_secret(UUID) TO authenticated;
