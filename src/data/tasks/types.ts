import { Task } from '@/lib/taskUtils'; // Assuming Task is well-defined here

// Define a robust Json type
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface TaskFormValues {
  title: string;
  description: string;
  points: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
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
  priority: 'low' | 'medium' | 'high';
}

// Export this to fix the import error in mutation files
export type TaskWithId = Task & {
  id: string;
  week_identifier?: string | null;
  background_images?: Json | null; // Updated to use defined Json type
  // ... other fields from Task, ensuring consistency
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

// Define variables for creating a task
export type CreateTaskVariables = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed' | 'last_completed_date' | 'title' | 'points'>> & {
  title: string;
  points: number;
  week_identifier?: string | null;
  background_images?: Json | null; // Updated to use defined Json type
  
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
export type UpdateTaskVariables = { id: string } & Partial<Omit<TaskWithId, 'id' | 'created_at' | 'updated_at' | 'background_images'>> & {
  background_images?: Json | null; // Ensure background_images here also uses the Json type
};
