-- Create Kanban columns table
CREATE TABLE IF NOT EXISTS kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create Kanban tasks table
CREATE TABLE IF NOT EXISTS kanban_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT, -- Optional color for task (null = no color)
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create Kanban comments table (for future use)
CREATE TABLE IF NOT EXISTS kanban_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kanban_columns
CREATE POLICY "Users can view own columns"
  ON kanban_columns
  FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own columns"
  ON kanban_columns
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own columns"
  ON kanban_columns
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own columns"
  ON kanban_columns
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for kanban_tasks
CREATE POLICY "Users can view own tasks"
  ON kanban_tasks
  FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own tasks"
  ON kanban_tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON kanban_tasks
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON kanban_tasks
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for kanban_comments
CREATE POLICY "Users can view own comments"
  ON kanban_comments
  FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert own comments"
  ON kanban_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON kanban_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON kanban_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kanban_columns_user_position
  ON kanban_columns(user_id, position)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_kanban_tasks_column_position
  ON kanban_tasks(column_id, position)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_kanban_tasks_user
  ON kanban_tasks(user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_kanban_comments_task
  ON kanban_comments(task_id)
  WHERE deleted_at IS NULL;

-- Auto-update triggers for updated_at
CREATE OR REPLACE FUNCTION update_kanban_columns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kanban_columns_updated_at
  BEFORE UPDATE ON kanban_columns
  FOR EACH ROW
  EXECUTE FUNCTION update_kanban_columns_updated_at();

CREATE OR REPLACE FUNCTION update_kanban_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kanban_tasks_updated_at
  BEFORE UPDATE ON kanban_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_kanban_tasks_updated_at();

CREATE OR REPLACE FUNCTION update_kanban_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kanban_comments_updated_at
  BEFORE UPDATE ON kanban_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_kanban_comments_updated_at();

-- Function to initialize default columns for a user
CREATE OR REPLACE FUNCTION initialize_default_kanban_columns(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if user already has columns
  IF NOT EXISTS (
    SELECT 1 FROM kanban_columns
    WHERE user_id = p_user_id AND deleted_at IS NULL
  ) THEN
    -- Insert 3 default columns
    INSERT INTO kanban_columns (user_id, title, position, color) VALUES
      (p_user_id, 'To Do', 0, '#ef4444'),
      (p_user_id, 'In Progress', 1, '#f59e0b'),
      (p_user_id, 'Done', 2, '#10b981');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
