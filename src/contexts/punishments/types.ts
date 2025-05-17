
// Types for the Punishments feature
export interface PunishmentData {
  id?: string;
  title: string;
  description?: string | null;
  points: number;
  dom_points: number;
  background_image_url?: string | null;
  background_opacity: number;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  highlight_effect: boolean;
  icon_name?: string | null;
  icon_url?: string | null; // Added icon_url property
  icon_color: string;
  focal_point_x: number;
  focal_point_y: number;
  created_at?: string;
  updated_at?: string;
}

export interface PunishmentHistoryItem {
  id: string;
  punishment_id?: string;
  applied_date: string;
  points_deducted: number;
  day_of_week: number;
}

export interface PunishmentsContextType {
  punishments: PunishmentData[];
  savePunishment: (data: PunishmentData) => Promise<void>;
  deletePunishment: (id: string) => Promise<void>;
  isLoading: boolean;
  applyPunishment: (id: string) => Promise<void>;
  recentlyAppliedPunishments: PunishmentHistoryItem[];
  fetchRandomPunishment: () => PunishmentData | null;
}
