
// Defines the Task data structure for consistent use across the application.

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskFrequency = 'daily' | 'weekly'; // Add other frequencies if needed

export interface Task {
  id: string; // UUID
  title: string;
  description?: string | null;
  points: number; // Points awarded upon completion
  priority: TaskPriority;
  completed: boolean; // General completion status (e.g., for daily tasks, is it done today?)
  background_image_url?: string | null;
  background_opacity: number; // Default 100
  focal_point_x: number; // Default 50
  focal_point_y: number; // Default 50
  frequency: TaskFrequency;
  frequency_count: number; // How many times it can be completed per period (e.g., 3 times daily)
  usage_data: number[]; // Array of 7 numbers, for Mon-Sun completion counts for weekly tasks
  icon_url?: string | null;
  icon_name?: string | null;
  icon_color: string; // Default '#9b87f5'
  highlight_effect: boolean; // Default false
  title_color: string; // Default '#FFFFFF'
  subtext_color: string; // Default '#8E9196'
  calendar_color: string; // Default '#7E69AB'
  last_completed_date?: string | null; // YYYY-MM-DD of last completion
  created_at: string; // ISO string
  updated_at: string; // ISO string
  week_identifier?: string | null; // e.g., "2023-W42" for weekly tasks
  background_images?: { desktop?: string; mobile?: string } | null; // Optional: For different images on devices
  // user_id?: string; // If tasks are user-specific and fetched for a user
}

// Variables for creating a task. 'id', 'created_at', 'updated_at' are usually auto-generated.
// 'usage_data' typically starts as an array of zeros.
export type CreateTaskVariables = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'usage_data'> & {
  usage_data?: number[]; // Optional on creation, defaults to [0,0,0,0,0,0,0]
};

// Variables for updating a task. 'id' is required to identify the task.
export type UpdateTaskVariables = { id: string } & Partial<Omit<Task, 'id'>>;

