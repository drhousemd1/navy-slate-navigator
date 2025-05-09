
import { RefetchOptions, QueryObserverResult } from "@tanstack/react-query";

export interface PunishmentData {
  id: string;
  title: string;
  description?: string;
  points: number;
  dom_points?: number; // Added this property
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
  frequency_count?: number; // Added this property
  created_at?: string;
  updated_at?: string;
}

export interface PunishmentHistoryItem {
  id: string;
  punishment_id: string;
  applied_date: string;
  day_of_week: number;
  points_deducted: number;
}

export interface PunishmentsContextType {
  punishments: PunishmentData[];
  punishmentHistory: PunishmentHistoryItem[];
  loading: boolean;
  historyLoading: boolean;
  isSelectingRandom: boolean;
  selectedPunishment: PunishmentData | null;
  error: Error | null;
  createPunishment: (punishment: Omit<Partial<PunishmentData>, 'title'> & { title: string }) => Promise<PunishmentData>;
  updatePunishment: (id: string, punishment: Partial<PunishmentData>) => Promise<PunishmentData>;
  deletePunishment: (id: string) => Promise<boolean>; // Changed return type from void to boolean
  applyPunishment: (punishment: PunishmentData | { id: string; points: number }) => Promise<PunishmentHistoryItem>;
  selectRandomPunishment: () => void;
  resetRandomSelection: () => void;
  // Change return type to match the function's implementation which returns Promise<PunishmentData[]>
  fetchPunishments: () => Promise<PunishmentData[]>;
  refetchPunishments: (options?: RefetchOptions) => Promise<QueryObserverResult<PunishmentData[], Error>>;
  refetchHistory: (options?: RefetchOptions) => Promise<QueryObserverResult<PunishmentHistoryItem[], Error>>;
  getPunishmentHistory: (punishmentId: string) => PunishmentHistoryItem[];
  totalPointsDeducted: number;
}
