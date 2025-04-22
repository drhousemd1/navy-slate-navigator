
export interface Reward {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  cost: number;
  supply: number;
  title_color: string | null;
  description_color: string | null;
  highlight_effect: boolean;
  icon_name: string | null;
  icon_color: string | null;
}

export interface RewardUsage {
  id: string;
  reward_id: string;
  user_id: string;
  used_at: string;
  day_of_week: number;
  week_number: string;
}

export interface CreateRewardInput {
  title: string;
  description?: string | null;
  image_url?: string | null;
  cost?: number;
  supply?: number;
  title_color?: string;
  description_color?: string;
  highlight_effect?: boolean;
  icon_name?: string;
  icon_color?: string;
}

export interface UpdateRewardInput extends Partial<CreateRewardInput> {
  id: string;
}
