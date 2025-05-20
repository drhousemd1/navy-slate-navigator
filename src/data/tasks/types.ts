
import { Task } from '@/lib/taskUtils'; // Assuming Task is well-defined here

// Export this to fix the import error in mutation files
export type TaskWithId = Task & { 
  id: string;
  // Add optional fields here that are present in the DB 'tasks' table 
  // but might not be in the base 'Task' type from taskUtils.ts.
  // This makes TaskWithId a more complete representation of a task object.
  week_identifier?: string | null;
  background_images?: any; // Ideally, replace 'any' with a more specific type e.g., JsonValue
  // Ensure all other fields from the 'tasks' table that are part of a "full" task object
  // are also optionally here if not guaranteed by the base 'Task' type.
  // For example, if 'Task' from lib/taskUtils doesn't include all fields from the DB:
  description?: string | null; // if not already on Task
  frequency?: 'daily' | 'weekly'; // if not already on Task
  frequency_count?: number; // if not already on Task
  priority?: 'low' | 'medium' | 'high'; // if not already on Task
  icon_name?: string | null; // if not already on Task
  icon_color?: string; // if not already on Task
  title_color?: string; // if not already on Task
  subtext_color?: string; // if not already on Task
  calendar_color?: string; // if not already on Task
  background_image_url?: string | null; // if not already on Task
  background_opacity?: number; // if not already on Task
  highlight_effect?: boolean; // if not already on Task
  focal_point_x?: number; // if not already on Task
  focal_point_y?: number; // if not already on Task
  icon_url?: string | null; // if not already on Task
  usage_data?: number[] | null; // if not already on Task
  completed?: boolean; // if not already on Task
  last_completed_date?: string | null; // if not already on Task
  points?: number; // if not already on Task
  title?: string; // if not already on Task
};

// Define variables for creating a task
// Title and points are required, others can be optional or have defaults
export type CreateTaskVariables = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed' | 'last_completed_date' | 'title' | 'points'>> & {
  title: string;
  points: number;
  // Explicitly add fields that were causing type errors, ensuring they are optional
  week_identifier?: string | null;
  background_images?: any; // Ideally, replace 'any' with a more specific type like JsonValue if available
  
  // Other optional fields explicitly listed for clarity
  description?: string;
  frequency?: 'daily' | 'weekly';
  frequency_count?: number;
  priority?: 'low' | 'medium' | 'high';
  icon_name?: string;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  background_image_url?: string;
  background_opacity?: number;
  highlight_effect?: boolean;
  focal_point_x?: number;
  focal_point_y?: number;
  icon_url?: string;
  usage_data?: number[];
};

// Define variables for updating a task
export type UpdateTaskVariables = { id: string } & Partial<Omit<TaskWithId, 'id' | 'created_at' | 'updated_at'>>; // Use TaskWithId here for consistency
