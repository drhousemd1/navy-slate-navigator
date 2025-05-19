
// Types for the Punishments feature
export interface PunishmentData {
  id?: string;
  title: string;
  description?: string | null;
  points: number;
  dom_points?: number | null; // Points the Dominant earns when punishment is applied
  dom_supply: number; // Available stock of the punishment
  background_image_url?: string | null;
  background_opacity: number;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  highlight_effect: boolean;
  icon_name?: string | null;
  icon_url?: string | null; // Keep if used, otherwise can remove
  icon_color: string;
  focal_point_x: number;
  focal_point_y: number;
  usage_data?: number[]; // Optional as it might not be present on all DB rows initially
  frequency_count?: number; // Optional as it might not be present on all DB rows initially
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
  id: string;
  costPoints: number;
  domEarn: number; // This field is present but might not be used directly in applyPunishment operation
  profileId: string; 
  subPoints: number; 
  domPoints: number;
}

// Define CreatePunishmentVariables for punishment creation payload.
// Note: user_id will be added by the operation, not passed from the form directly this way.
// dom_points is not part of creation, it's calculated or set differently.
export interface CreatePunishmentVariables {
  title: string;
  points: number;
  description?: string | null;
  dom_supply?: number; // Defaulted in mutation if not provided
  // Visual properties
  icon_name?: string | null;
  icon_color?: string;
  background_image_url?: string | null;
  background_opacity?: number;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
  highlight_effect?: boolean;
  focal_point_x?: number;
  focal_point_y?: number;
  // System fields (handled by backend/mutations)
  user_id?: string; // Added by the operation using auth context
}


export interface PunishmentsContextType {
  punishments: PunishmentData[];
  savePunishment: (data: Partial<PunishmentData>) => Promise<PunishmentData>;
  deletePunishment: (id: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  applyPunishment: (args: ApplyPunishmentArgs) => Promise<void>;
  recentlyAppliedPunishments: PunishmentHistoryItem[]; // This might be deprecated or need specific logic
  fetchRandomPunishment: () => PunishmentData | null;
  refetchPunishments: () => Promise<import('@tanstack/react-query').QueryObserverResult<PunishmentData[], Error>>;
  getPunishmentHistory: (id: string) => PunishmentHistoryItem[];
  historyLoading: boolean;
}

