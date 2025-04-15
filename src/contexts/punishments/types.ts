
export interface PunishmentData {
  id?: string;
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
  background_images?: string[];
  carousel_timer?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PunishmentHistoryItem {
  id: string;
  punishment_id?: string;
  points_deducted: number;
  applied_date?: string;
  day_of_week: number;
}

export interface PunishmentsContextType {
  punishments: PunishmentData[];
  punishmentHistory: PunishmentHistoryItem[];
  loading: boolean;
  error: Error | null;
  totalPointsDeducted: number;
  globalCarouselTimer: number;
  setGlobalCarouselTimer: (value: number) => void;
  fetchPunishments: () => Promise<void>;
  createPunishment: (data: PunishmentData) => Promise<PunishmentData>;
  updatePunishment: (id: string, data: Partial<PunishmentData>) => Promise<PunishmentData>;
  deletePunishment: (id: string) => Promise<void>;
  applyPunishment: (id: string) => Promise<void>;
  getPunishmentHistory: (punishmentId: string) => PunishmentHistoryItem[];
  refresh?: () => Promise<void>; // New refresh function
}
