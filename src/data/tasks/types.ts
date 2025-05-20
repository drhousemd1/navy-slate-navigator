
import { Task as BaseTask } from '@/lib/taskUtils'; 

export type TaskWithId = BaseTask & { 
  id: string;
  user_id: string; // Ensured user_id is here and required
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
  // points is already in BaseTask
  // title is already in BaseTask
};

export type Task = BaseTask;

export type CreateTaskVariables = Partial<Omit<TaskWithId, 'id' | 'created_at' | 'updated_at' | 'completed' | 'last_completed_date' | 'title' | 'points' | 'user_id' | 'priority' | 'frequency' | 'frequency_count' | 'usage_data' >> & {
  title: string;
  points: number;
  user_id: string; 
  week_identifier?: string | null;
  background_images?: any;
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

export type UpdateTaskVariables = { id: string } & Partial<Omit<TaskWithId, 'id' | 'created_at' | 'updated_at' | 'user_id'>>;

