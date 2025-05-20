
// Types for the Punishments feature
export interface PunishmentData {
  id?: string; // Made optional to reflect that new punishments won't have an ID until saved
  title: string;
  description: string; // Changed from optional string | null
  points: number; // Cost for the submissive in sub_points
  dom_points: number; // Changed from optional number | null
  dom_supply: number; // Available stock of the punishment
  background_image_url?: string | null;
  background_opacity: number; 
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  highlight_effect: boolean;
  icon_name?: string | null;
  icon_url?: string | null;
  icon_color: string;
  focal_point_x: number;
  focal_point_y: number;
  usage_data?: number[];
  frequency_count?: number;
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

export interface ApplyPunishmentArgs {
  id: string; // Punishment ID is required
  costPoints: number;
  domEarn: number;
  profileId: string; // User's profile ID
  subPoints: number; // Current submissive points of the user
  domPoints: number; // Current dominant points of the user
}

export interface PunishmentsContextType {
  punishments: PunishmentData[];
  isLoading: boolean;
  error: Error | null;
  applyPunishment: (args: ApplyPunishmentArgs) => Promise<void>;
  recentlyAppliedPunishments: PunishmentHistoryItem[];
  fetchRandomPunishment: () => PunishmentData | null;
  refetchPunishments: () => Promise<any>;
  getPunishmentHistory: (id: string) => PunishmentHistoryItem[];
  historyLoading: boolean;
}
