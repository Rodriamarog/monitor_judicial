-- Create Vault RPC functions for secure secret management
-- These functions are SECURITY DEFINER and only callable by service role

-- Function to create a secret in Vault
-- Returns the UUID of the created secret
CREATE OR REPLACE FUNCTION vault_create_secret(
  secret_value TEXT,
  secret_name TEXT DEFAULT NULL,
  secret_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_id UUID;
BEGIN
  -- Insert into vault.secrets and return the ID
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (secret_value, secret_name, secret_description)
  RETURNING id INTO secret_id;

  RETURN secret_id;
END;
$$;

-- Function to retrieve a secret from Vault
-- Returns the decrypted secret value
CREATE OR REPLACE FUNCTION vault_get_secret(
  secret_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  -- Retrieve the decrypted secret
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE id = secret_id;

  RETURN secret_value;
END;
$$;

-- Function to delete a secret from Vault
-- Returns TRUE if deleted successfully
CREATE OR REPLACE FUNCTION vault_delete_secret(
  secret_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete the secret
  DELETE FROM vault.secrets
  WHERE id = secret_id;

  RETURN FOUND;
END;
$$;

-- Grant execute permissions to authenticated users
-- Note: These functions are SECURITY DEFINER, so they run with the permissions
-- of the function creator (superuser), but we still need to grant execute
GRANT EXECUTE ON FUNCTION vault_create_secret(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION vault_get_secret(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION vault_delete_secret(UUID) TO authenticated;

-- Also grant to service_role for cron jobs
GRANT EXECUTE ON FUNCTION vault_create_secret(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION vault_get_secret(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION vault_delete_secret(UUID) TO service_role;
