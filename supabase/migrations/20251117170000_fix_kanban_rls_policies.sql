-- Fix RLS policies for kanban tables to allow soft deletes

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Users can update own columns" ON kanban_columns;
DROP POLICY IF EXISTS "Users can update own tasks" ON kanban_tasks;
DROP POLICY IF EXISTS "Users can update own comments" ON kanban_comments;

-- Recreate UPDATE policies with WITH CHECK clause
CREATE POLICY "Users can update own columns"
  ON kanban_columns
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON kanban_tasks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON kanban_comments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
