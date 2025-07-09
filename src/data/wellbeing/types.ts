export interface WellbeingSnapshot {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  metrics: Record<string, number>;
  overall_score: number;
}

export interface WellbeingMetrics {
  // Negative-loaded metrics (higher = worse)
  anxiety: number;
  stress: number;
  irritability: number;
  overwhelm: number;
  // Positive-loaded metrics (higher = better)
  energy: number;
  intimacy: number;
  physical_touch: number;
  emotional_support: number;
}

export interface CreateWellbeingData {
  metrics: WellbeingMetrics;
  overall_score: number;
}

export interface UpdateWellbeingData {
  id: string;
  metrics?: WellbeingMetrics;
  overall_score?: number;
}

export const DEFAULT_METRICS: WellbeingMetrics = {
  anxiety: 50,
  stress: 50,
  irritability: 50,
  overwhelm: 50,
  energy: 50,
  intimacy: 50,
  physical_touch: 50,
  emotional_support: 50,
};

// Wellness reminder types
export interface WellnessReminder {
  id: string;
  user_id: string;
  enabled: boolean;
  reminder_time: string; // Format: "HH:MM:SS"
  timezone: string;
  last_sent: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWellnessReminderData {
  enabled: boolean;
  reminder_time: string;
  timezone: string;
}

export interface UpdateWellnessReminderData {
  enabled?: boolean;
  reminder_time?: string;
  timezone?: string;
}