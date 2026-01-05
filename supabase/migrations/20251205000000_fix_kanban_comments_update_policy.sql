-- Fix kanban_comments UPDATE policy to allow soft deletes
-- Remove the WITH CHECK clause entirely to allow updates including soft deletes

DROP POLICY IF EXISTS "Users can update own comments" ON kanban_comments;

CREATE POLICY "Users can update own comments"
  ON kanban_comments
  FOR UPDATE
  USING (auth.uid() = user_id);
