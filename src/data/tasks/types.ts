
// src/data/tasks/types.ts

export type TaskPriority = "low" | "medium" | "high";
export type TaskFrequency = "daily" | "weekly";

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  points: number;
  priority: TaskPriority;
  completed: boolean;
  background_image_url?: string | null;
  background_opacity: number; // Assuming 0-100 range
  focal_point_x: number; // Percentage (0-100)
  focal_point_y: number; // Percentage (0-100)
  frequency: TaskFrequency;
  frequency_count: number; // e.g., 3 times a week
  usage_data: number[]; // Timestamps of completions or other relevant data
  icon_url?: string | null;
  icon_name?: string | null; // For Lucide icons or similar
  icon_color: string; // Hex color
  highlight_effect: boolean;
  title_color: string; // Hex color
  subtext_color: string; // Hex color
  calendar_color: string; // Hex color for calendar display
  last_completed_date?: string | null; // ISO date string
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  // user_id?: string; // If tasks are user-specific and RLS is applied based on this
  week_identifier?: string | null; // Added
  background_images?: any | null; // Added, consider a more specific type if known (e.g., { desktop: string, mobile: string })
}

// CreateTaskVariables will now correctly include optional week_identifier and background_images
export type CreateTaskVariables = Omit<Task, "id" | "created_at" | "updated_at" | "completed" | "usage_data" | "last_completed_date">;

// UpdateTaskVariables will also correctly include optional week_identifier and background_images
export type UpdateTaskVariables = { id: string } & Partial<Omit<Task, "id" | "created_at" | "updated_at">>;

