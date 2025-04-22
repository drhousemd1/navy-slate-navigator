
export type PunishmentData = {
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
  usage_data?: number[];
  created_at?: string;
  updated_at?: string;
};

export type PunishmentHistoryItem = {
  id: string;
  punishment_id: string;
  applied_date: string;
  day_of_week: number;
  points_deducted: number;
};

export interface PunishmentsContextType {
  punishments: PunishmentData[];
  punishmentHistory: PunishmentHistoryItem[];
  loading: boolean;
  error: Error | null;
  isSelectingRandom?: boolean;
  selectedPunishment?: PunishmentData | null;
  fetchPunishments: () => Promise<void>;
  createPunishment: (punishmentData: Partial<PunishmentData>) => Promise<string>;
  updatePunishment: (id: string, punishmentData: Partial<PunishmentData>) => Promise<void>;
  deletePunishment: (id: string) => Promise<void>;
  applyPunishment: (punishmentId: string, points: number) => Promise<void>;
  getPunishmentHistory: (punishmentId: string) => PunishmentHistoryItem[];
  totalPointsDeducted: number;
  selectRandomPunishment?: () => void;
  resetRandomSelection?: () => void;
  refetchPunishments?: () => Promise<any>;
  refetchHistory?: () => Promise<any>;
}
