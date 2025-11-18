-- Update default column names to Spanish

-- Drop and recreate the function with Spanish names
DROP FUNCTION IF EXISTS initialize_default_kanban_columns(UUID);

CREATE OR REPLACE FUNCTION initialize_default_kanban_columns(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if user already has columns
  IF NOT EXISTS (
    SELECT 1 FROM kanban_columns
    WHERE user_id = p_user_id AND deleted_at IS NULL
  ) THEN
    -- Insert 3 default columns with Spanish names
    INSERT INTO kanban_columns (user_id, title, position, color) VALUES
      (p_user_id, 'Pendiente', 0, '#ef4444'),
      (p_user_id, 'En Progreso', 1, '#f59e0b'),
      (p_user_id, 'Terminado', 2, '#10b981');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
