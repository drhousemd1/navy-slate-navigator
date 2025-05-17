
// Types for the Punishments feature
export interface PunishmentData {
  id?: string; // Made optional to reflect that new punishments won't have an ID until saved
  title: string;
  description?: string | null;
  points: number;
  dom_points?: number | null;
  background_image_url?: string | null;
  background_opacity: number; // Still required, default will be handled in form/data layer
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
  savePunishment: (data: Partial<PunishmentData>) => Promise<void>;
  deletePunishment: (id: string) => Promise<void>; // Return Promise<void>
  isLoading: boolean; // Should match the hook's loading state name
  applyPunishment: (args: ApplyPunishmentArgs) => Promise<void>;
  recentlyAppliedPunishments: PunishmentHistoryItem[];
  fetchRandomPunishment: () => PunishmentData | null; // Or selectRandomPunishment
  refetchPunishments: () => Promise<any>; // Using 'any' for QueryObserverResult for simplicity now, can be refined
  getPunishmentHistory: (id: string) => PunishmentHistoryItem[];
  historyLoading: boolean;
}
