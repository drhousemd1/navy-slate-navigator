
import { Task } from '@/lib/taskUtils';

// Export TaskWithId to fix the import errors
export type TaskWithId = Task & { id: string };

// Define variables for creating a task
// Title and points are required, others can be optional or have defaults
export type CreateTaskVariables = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed' | 'last_completed_date' | 'title' | 'points' | 'usage_data'>> & {
  title: string;
  points: number;
  // Explicitly add fields that were causing type errors, ensuring they are optional
  week_identifier?: string | null;
  background_images?: any; // Using any for compatibility, but ideally should match Task definition
  
  // Other optional fields explicitly listed for clarity
  description?: string;
  frequency?: string;
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
};

// Define variables for updating a task
export type UpdateTaskVariables = { id: string } & Partial<Omit<Task, 'id'>>;
