-- Change assigned_to column from UUID to VARCHAR to store email addresses
-- This allows assigning tasks to collaborators who don't have user accounts

-- Drop the foreign key constraint (was linking to user_profiles.id)
ALTER TABLE kanban_tasks
DROP CONSTRAINT IF EXISTS kanban_tasks_assigned_to_fkey;

-- Clear existing UUID values (3 tasks were assigned, will need to be reassigned)
UPDATE kanban_tasks SET assigned_to = NULL WHERE assigned_to IS NOT NULL;

-- Change column type from UUID to VARCHAR
ALTER TABLE kanban_tasks
ALTER COLUMN assigned_to TYPE VARCHAR(255) USING NULL;

-- Add documentation comment
COMMENT ON COLUMN kanban_tasks.assigned_to IS
'Email address of the assigned user (main user or collaborator). NULL means unassigned.';
