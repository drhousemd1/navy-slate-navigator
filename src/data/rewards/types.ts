
export interface Reward {
  id: string;
  title: string;
  description?: string | null; // Changed to optional
  cost: number;
  supply: number;
  background_image_url?: string | null;
  background_opacity: number;
  icon_name?: string | null;
  icon_url?: string | null;
  icon_color: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  is_dom_reward: boolean;
  created_at?: string;
  updated_at?: string;
}

// Used for optimistic updates
export type RewardWithId = Reward & { id: string };

// Define the form values interface for reward forms
export interface RewardFormValues {
  title: string;
  description: string; // Nullable in DB, but often a string in forms
  cost: number;
  supply: number; // Added supply
  is_dom_reward: boolean;
  icon_name: string | null;
  icon_color: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  highlight_effect: boolean;
  background_image_url: string | null;
  background_opacity: number;
  focal_point_x: number;
  focal_point_y: number;
}

// Align this with the type in useSaveReward.ts by making all fields from Reward present and required
export type CreateRewardVariables = {
  title: string;
  cost: number;
  supply: number;
  is_dom_reward: boolean;
  description?: string | null;
  background_image_url?: string | null;
  background_opacity: number; // Changed from optional to required
  icon_name?: string | null;
  icon_url?: string | null;
  icon_color: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
};

export type UpdateRewardVariables = { id: string } & Partial<Omit<Reward, 'id' | 'created_at' | 'updated_at'>>;
