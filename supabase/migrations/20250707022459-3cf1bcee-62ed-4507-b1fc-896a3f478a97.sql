-- Add is_dom_task column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS is_dom_task BOOLEAN NOT NULL DEFAULT FALSE;