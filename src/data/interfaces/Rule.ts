
import { Json } from '@/data/tasks/types';

// Rule interface definition to be used across rule-related data handling
export interface Rule {
  id: string;
  title: string;
  description?: string | null;
  points_deducted?: number;
  dom_points_deducted?: number;
  priority: 'low' | 'medium' | 'high';
  background_image_url?: string | null;
  background_opacity: number;
  icon_url?: string | null;
  icon_name?: string | null;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  usage_data: number[];
  image_meta?: Json | null;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}
