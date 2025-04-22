
export interface Punishment {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  points: number;
  title_color: string | null;
  description_color: string | null;
  highlight_effect: boolean;
  icon_name: string | null;
  icon_color: string | null;
}

export interface PunishmentApplication {
  id: string;
  punishment_id: string;
  user_id: string;
  applied_at: string;
  points_deducted: number;
  day_of_week: number;
}

export interface CreatePunishmentInput {
  title: string;
  description?: string | null;
  image_url?: string | null;
  points?: number;
  title_color?: string;
  description_color?: string;
  highlight_effect?: boolean;
  icon_name?: string;
  icon_color?: string;
}

export interface UpdatePunishmentInput extends Partial<CreatePunishmentInput> {
  id: string;
}
