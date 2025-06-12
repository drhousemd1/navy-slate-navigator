
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: string;  // Simple string, not union type
  frequency: string; // Simple string, not union type
  frequency_count: number;
  points: number;
  background_image_url?: string;
  background_opacity: number;
  icon_url?: string;
  icon_name?: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  completed: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  last_completed_date?: string;
  usage_data?: Json;
  week_identifier?: string;
  background_images?: Json;
}

// Export the TaskWithId type that other files are expecting
export type TaskWithId = Task;

export interface TaskFormValues {
  title: string;
  description?: string;
  priority: string;  // Simple string
  frequency: string; // Simple string
  frequency_count: number;
  points: number;
  background_image_url?: string;
  background_opacity: number;
  icon_url?: string;
  icon_name?: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
}

export interface CreateTaskVariables {
  title: string;
  user_id: string;
  description?: string;
  priority?: string;  // Simple string
  frequency?: string; // Simple string
  frequency_count?: number;
  points?: number;
  background_image_url?: string;
  background_opacity?: number;
  icon_url?: string;
  icon_name?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  icon_color?: string;
  highlight_effect?: boolean;
  focal_point_x?: number;
  focal_point_y?: number;
}

export interface UpdateTaskVariables {
  id: string;
  title?: string;
  description?: string;
  priority?: string;  // Simple string
  frequency?: string; // Simple string
  frequency_count?: number;
  points?: number;
  background_image_url?: string;
  background_opacity?: number;
  icon_url?: string;
  icon_name?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  icon_color?: string;
  highlight_effect?: boolean;
  focal_point_x?: number;
  focal_point_y?: number;
  completed?: boolean;
  usage_data?: Json;
  last_completed_date?: string;
}
