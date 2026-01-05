-- Add assigned_to column to kanban_tasks
ALTER TABLE kanban_tasks
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add parent_task_id for subtasks support
ALTER TABLE kanban_tasks
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE;

-- Add is_completed for subtasks
ALTER TABLE kanban_tasks
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_assigned_to
  ON kanban_tasks(assigned_to)
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kanban_tasks_parent_task_id
  ON kanban_tasks(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN kanban_tasks.assigned_to IS 'User assigned to this task';
COMMENT ON COLUMN kanban_tasks.parent_task_id IS 'Parent task ID if this is a subtask';
COMMENT ON COLUMN kanban_tasks.is_completed IS 'Whether this subtask is completed (checkbox)';
