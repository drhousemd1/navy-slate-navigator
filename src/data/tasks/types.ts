
import { Json } from '@/integrations/supabase/types';

export type { Json };

export interface TaskWithId {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  points: number;
  completed: boolean;
  frequency: string;
  frequency_count: number;
  priority: string;
  icon_name: string | null;
  icon_color: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  background_image_url: string | null;
  background_opacity: number;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  week_identifier: string | null;
  icon_url: string | null;
  usage_data: number[];
  last_completed_date: string | null;
  background_images: Json | null;
  image_meta: Json | null; // Add image_meta field
  user_id: string;
  optimisticId?: string;
}

export interface CreateTaskVariables {
  title: string;
  description?: string;
  points: number;
  frequency?: string;
  frequency_count?: number;
  priority?: string;
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
  week_identifier?: string;
  icon_url?: string;
  usage_data?: number[];
  background_images?: Json;
  image_meta?: any; // Add image_meta field - allow any type for form data
  user_id: string;
}

export interface UpdateTaskVariables extends Partial<CreateTaskVariables> {
  id: string;
  last_completed_date?: string;
  completed?: boolean;
}

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
  image_meta?: any; // Add image_meta field
}
