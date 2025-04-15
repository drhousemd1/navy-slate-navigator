
// If this file doesn't exist, we're creating it
export interface PunishmentData {
  id: string;
  title: string;
  description?: string | null;
  points: number;
  icon_name?: string | null;
  icon_color?: string;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  background_image_url?: string | null;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  background_images?: string[];
  carousel_timer?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PunishmentHistoryItem {
  id: string;
  punishment_id?: string;
  points_deducted: number;
  day_of_week: number;
  applied_date?: string;
}

export interface PunishmentsContextType {
  punishments: PunishmentData[];
  punishmentHistory: PunishmentHistoryItem[];
  loading: boolean;
  error: Error | null;
  totalPointsDeducted: number;
  globalCarouselTimer: number;
  setGlobalCarouselTimer: (timer: number) => void;
  fetchPunishments: () => Promise<void>;
  createPunishment: (data: PunishmentData) => Promise<PunishmentData>;
  updatePunishment: (id: string, data: Partial<PunishmentData>) => Promise<void>;
  deletePunishment: (id: string) => Promise<void>;
  applyPunishment: (data: Partial<PunishmentHistoryItem>) => Promise<void>;
  getPunishmentHistory: (id?: string) => PunishmentHistoryItem[];
}
