export interface WellbeingMetrics {
  anxiety: number; stress: number; irritability: number; overwhelm: number;
  energy: number; intimacy: number; physical_touch: number; emotional_support: number;
}
export const DEFAULT_METRICS: WellbeingMetrics = {
  anxiety: 50, stress: 50, irritability: 50, overwhelm: 50,
  energy: 50, intimacy: 50, physical_touch: 50, emotional_support: 50,
};
export interface WellbeingScope {
  backendId: string; accountId: string; relationshipId: string; relationshipSessionId: string;
}
export interface WellbeingSnapshot {
  id: string; userId: string; participantId: string | null; relationshipId: string;
  relationshipSessionId: string | null; commandId: string | null;
  metrics: Partial<WellbeingMetrics>; rawMetrics: unknown; overallScore: number;
  scoreVersion: string | null; recordedAt: string | null; clientReportedAt: string | null;
  timezone: string | null; localDate: string | null;
  provenance: 'confirmed_checkin' | 'legacy_snapshot';
  legacyCreatedAt: string | null; legacyUpdatedAt: string | null;
}
export interface WellbeingPerson {
  userId: string; role: 'dom' | 'sub'; timezone: string | null; latest: WellbeingSnapshot | null;
}
export interface WellbeingRequest {
  commandId: string; scope: WellbeingScope; expectedTimezone: string;
  metrics: WellbeingMetrics; clientReportedAt: string;
}
export interface WellbeingDraft {
  version: 1; scope: WellbeingScope; metrics: WellbeingMetrics;
  pending: WellbeingRequest | null;
}
export type CreateWellbeingData = WellbeingRequest;
export interface UpdateWellbeingData { id: string; metrics?: WellbeingMetrics }

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