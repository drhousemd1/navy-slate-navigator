import { Task } from '@/lib/taskUtils'; // Assuming Task is well-defined here

// Export this to fix the import error in mutation files
export type TaskWithId = Task & { id: string };

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
export type UpdateTaskVariables = { id: string } & Partial<Omit<Task, 'id'>>;
