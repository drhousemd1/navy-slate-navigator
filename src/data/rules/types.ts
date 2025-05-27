
import { Json } from '@/data/tasks/types'; // Re-use Json type

// Based on the 'rules' table schema
export interface RawSupabaseRule {
  id: string;
  user_id?: string | null;
  title: string;
  description?: string | null;
  priority: 'low' | 'medium' | 'high' | string; // DB might store as string
  frequency: 'daily' | 'weekly' | string; // DB might store as string
  frequency_count: number;
  icon_name?: string | null;
  icon_url?: string | null;
  icon_color: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  background_image_url?: string | null;
  background_image_path?: string | null; // Not typically used on client
  background_opacity: number;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  usage_data?: Json | null;
  background_images?: Json | null;
  created_at: string;
  updated_at: string;
}

// App-specific Rule type (processed from RawSupabaseRule)
export interface Rule {
  id: string;
  user_id?: string | null;
  title: string;
  description?: string | null;
  priority: 'low' | 'medium' | 'high';
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  icon_name?: string | null;
  icon_url?: string | null;
  icon_color: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  background_image_url?: string | null;
  background_opacity: number;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  usage_data?: number[] | null; // Processed from Json
  background_images?: Json | null; // Keep as Json for now, or define a structure
  created_at: string;
  updated_at: string;
  optimisticId?: string;
}

export interface RuleFormValues {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  icon_name?: string;
  icon_url?: string;
  icon_color: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  background_image_url?: string;
  background_opacity: number;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  background_images?: Json | null;
}

export type CreateRuleVariables = Omit<RuleFormValues, 'id'> & {
  user_id?: string;
  usage_data?: number[]; // Typically initialized empty
};

export type UpdateRuleVariables = { id: string } & Partial<RuleFormValues>;

