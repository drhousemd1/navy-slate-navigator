
import { Task as BaseTask } from '@/lib/taskUtils'; // Renaming to BaseTask to avoid conflict if Task is locally defined elsewhere

// Export TaskWithId which is BaseTask extended with DB fields
export type TaskWithId = BaseTask & { 
  id: string;
  user_id: string; // Added user_id
  week_identifier?: string | null;
  background_images?: any; 
  description?: string | null; 
  frequency?: 'daily' | 'weekly'; 
  frequency_count?: number; 
  priority?: 'low' | 'medium' | 'high'; 
  icon_name?: string | null; 
  icon_color?: string; 
  title_color?: string; 
  subtext_color?: string; 
  calendar_color?: string; 
  background_image_url?: string | null; 
  background_opacity?: number; 
  highlight_effect?: boolean; 
  focal_point_x?: number; 
  focal_point_y?: number; 
  icon_url?: string | null; 
  usage_data?: number[] | null; 
  completed?: boolean; 
  last_completed_date?: string | null; 
  points?: number; 
  title?: string; 
};

// Re-export BaseTask if it's needed directly by other modules from this file
export type Task = BaseTask; // This was causing "Task is declared locally but not exported" - ensure BaseTask is what's intended if Task is used.

// Define variables for creating a task
// Title and points are required, others can be optional or have defaults
export type CreateTaskVariables = Partial<Omit<TaskWithId, 'id' | 'created_at' | 'updated_at' | 'completed' | 'last_completed_date' | 'title' | 'points' | 'user_id'>> & {
  title: string;
  points: number;
  user_id: string; // user_id is here for creation
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
export type UpdateTaskVariables = { id: string } & Partial<Omit<TaskWithId, 'id' | 'created_at' | 'updated_at' | 'user_id'>>; // user_id likely shouldn't be updatable this way
