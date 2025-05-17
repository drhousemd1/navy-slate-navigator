// Types for the Punishments feature
export interface PunishmentData {
  id?: string;
  title: string;
  description?: string | null;
  points: number;
  dom_points?: number | null; // Made optional/nullable to match DB and usage
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
  usage_data?: number[]; // Added
  frequency_count?: number; // Added
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
  savePunishment: (data: Partial<PunishmentData>) => Promise<void>; // Changed PunishmentData to Partial<PunishmentData> for updates
  deletePunishment: (id: string) => Promise<void>;
  isLoading: boolean;
  applyPunishment: (args: ApplyPunishmentArgs) => Promise<void>; // Updated signature
  recentlyAppliedPunishments: PunishmentHistoryItem[];
  fetchRandomPunishment: () => PunishmentData | null;
  // Added missing members based on usage and errors
  refetchPunishments: () => Promise<any>; // Using 'any' for QueryObserverResult for simplicity now, can be refined
  getPunishmentHistory: (id: string) => PunishmentHistoryItem[];
  historyLoading: boolean;
}
