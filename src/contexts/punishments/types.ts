
export interface PunishmentData {
  id: string;
  title: string;
  description?: string;
  points: number;
  icon_name?: string;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  background_images?: (string | null)[];
  carousel_timer?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PunishmentHistoryItem {
  id: string;
  punishment_id?: string;
  day_of_week: number;
  points_deducted: number;
  applied_date?: string;
}
