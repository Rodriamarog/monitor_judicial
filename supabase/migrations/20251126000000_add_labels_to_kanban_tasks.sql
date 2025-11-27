-- Add labels column to kanban_tasks table
ALTER TABLE kanban_tasks
ADD COLUMN IF NOT EXISTS labels JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance on labels
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_labels
  ON kanban_tasks USING GIN (labels);
