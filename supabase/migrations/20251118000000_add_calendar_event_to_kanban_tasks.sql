-- Add calendar_event_id to kanban_tasks for Google Calendar integration
ALTER TABLE kanban_tasks
ADD COLUMN IF NOT EXISTS calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_calendar_event
  ON kanban_tasks(calendar_event_id)
  WHERE calendar_event_id IS NOT NULL;
