
import type { Json } from "@/integrations/supabase/types";

export type { Json } from "@/integrations/supabase/types";

export interface Task {
  id: string;
  title: string;
  description?: string;
  frequency: string;
  frequency_count: number;
  points: number;
  priority: 'low' | 'medium' | 'high';
  icon_name?: string;
  icon_color: string;
  icon_url?: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  background_image_url?: string;
  background_images?: Json;
  background_opacity: number;
  focal_point_x: number;
  focal_point_y: number;
  highlight_effect: boolean;
  completed: boolean;
  last_completed_date?: string;
  week_identifier?: string;
  usage_data?: Json;
  image_meta?: Json | null;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  is_dom_task: boolean;
}

export interface TaskWithId extends Task {
  id: string;
  optimisticId?: string;
}

export interface RawSupabaseTask extends Omit<Task, 'priority'> {
  priority: string;
}

export interface TaskFormValues {
  title: string;
  description: string;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  points: number;
  priority: 'low' | 'medium' | 'high';
  icon_name?: string;
  icon_color: string;
  icon_url?: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  background_image_url?: string;
  background_images?: Json;
  background_opacity: number;
  focal_point_x: number;
  focal_point_y: number;
  highlight_effect: boolean;
  image_meta?: Json | null;
  is_dom_task: boolean;
}

export interface CreateTaskVariables extends TaskFormValues {
  user_id: string;
  week_identifier?: string;
  usage_data?: Json;
}

export interface UpdateTaskVariables extends Partial<TaskFormValues> {
  id: string;
  user_id?: string;
  week_identifier?: string;
  usage_data?: Json;
  completed?: boolean;
  last_completed_date?: string;
}
