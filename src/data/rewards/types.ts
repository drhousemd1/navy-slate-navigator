
export interface Reward {
  id: string;
  title: string;
  description: string | null;
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
export type CreateRewardVariables = Partial<Omit<Reward, 'id' | 'created_at' | 'updated_at'>> & { title: string; cost: number; supply: number; is_dom_reward: boolean; };
export type UpdateRewardVariables = { id: string } & Partial<Omit<Reward, 'id' | 'created_at' | 'updated_at'>>;

