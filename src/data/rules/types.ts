
import { Json } from '@/data/tasks/types'; // Assuming Json type is available from tasks/types or define it if not
import { ImageMetadata } from '@/utils/image/helpers';

export interface Rule {
  id: string;
  title: string;
  description?: string;
  points_deducted: number;
  dom_points_deducted: number;
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
  created_at?: string;
  updated_at?: string;
  // New image metadata fields for compression system
  image_meta?: ImageMetadata;
  background_images?: Json; // For multiple image support
}

export interface RuleViolation {
  id: string; // UUID
  rule_id: string; // UUID, foreign key to rules table
  violation_date: string; // ISO string, YYYY-MM-DDTHH:mm:ss.sssZ
  day_of_week: number; // 0 (Sunday) - 6 (Saturday)
  week_number: string; // YYYY-Www, e.g., "2023-W42"
  // created_at is handled by the database (default now())
}

export interface RuleFormValues {
  title: string;
  description: string;
  points_deducted: number;
  dom_points_deducted: number;
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
  // New image metadata fields for compression system
  image_meta?: ImageMetadata;
  background_images?: Json;
}

// Variables needed to create a rule violation.
// rule_id is essential. violation_date, day_of_week, week_number will be generated.
export type CreateRuleViolationVariables = {
  rule_id: string;
};

/**
 * Represents the raw data structure of a rule as fetched directly from the Supabase 'rules' table.
 * This interface should match the table schema columns before any client-side processing or mapping.
 */
export interface RawSupabaseRule {
  id: string; // uuid
  user_id?: string | null; // uuid
  title: string; // text
  description?: string | null; // text
  priority: string; // text, e.g., 'low', 'medium', 'high' (unlike processed Rule which might use an enum)
  background_image_url?: string | null; // text
  background_image_path?: string | null; // text
  background_opacity: number; // integer
  icon_url?: string | null; // text
  icon_name?: string | null; // text
  title_color: string; // text
  subtext_color: string; // text
  calendar_color: string; // text
  icon_color: string; // text
  highlight_effect: boolean; // boolean
  focal_point_x: number; // integer
  focal_point_y: number; // integer
  frequency: string; // text, e.g., 'daily', 'weekly' (unlike processed Rule)
  frequency_count: number; // integer
  usage_data?: Json | null; // jsonb (can be an array or other JSON structure)
  background_images?: Json | null; // jsonb
  image_meta?: Json | null; // jsonb - New image metadata field
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
}
