
import { Json } from '@/data/tasks/types'; // Re-use Json type

// Based on the 'rewards' table schema
export interface RawSupabaseReward {
  id: string;
  user_id?: string | null; // Assuming user_id might be relevant for ownership
  title: string;
  description?: string | null;
  cost: number;
  supply: number; // 0 for unlimited
  icon_name?: string | null;
  icon_url?: string | null; // if custom uploaded icons are stored directly
  icon_color: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string; // Or a more generic color if not calendar-specific
  background_image_url?: string | null;
  background_opacity: number;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  is_dom_reward?: boolean;
  background_images?: Json | null; // if multiple background images are supported
  created_at: string;
  updated_at: string;
}

// App-specific Reward type
export interface Reward {
  id: string;
  user_id?: string | null;
  title: string;
  description?: string | null;
  cost: number;
  supply: number;
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
  is_dom_reward?: boolean;
  background_images?: Json | null;
  created_at: string;
  updated_at: string;
  optimisticId?: string;
}

export interface RewardFormValues {
  title: string;
  description?: string;
  cost: number;
  supply: number;
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
  is_dom_reward?: boolean;
  background_images?: Json | null;
}

export type CreateRewardVariables = Omit<RewardFormValues, 'id'> & { user_id?: string; };
export type UpdateRewardVariables = { id: string } & Partial<RewardFormValues>;

