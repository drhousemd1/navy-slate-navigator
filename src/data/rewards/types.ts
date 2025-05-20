
export interface Reward {
  id: string;
  title: string;
  description?: string | null; 
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

// Align this with the type in useSaveReward.ts by making all fields from Reward present and required
export type CreateRewardVariables = {
  title: string;
  cost: number;
  supply: number;
  is_dom_reward: boolean;
  description?: string | null;
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
};

export type UpdateRewardVariables = { id: string } & Partial<Omit<Reward, 'id' | 'created_at' | 'updated_at'>>;

export type RewardWithPointsAndSupply = Reward & {
  // No additional fields are strictly necessary here based on current errors.
  // If user points per reward were needed, they could be added:
  // userSubPoints?: number;
  // userDomPoints?: number;
};

