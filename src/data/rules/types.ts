
export interface Rule {
  id: string;
  title: string;
  description?: string;
  points_deducted: number;
  dom_points_deducted: number;
  background_image_url?: string;
  background_opacity: number;
  icon_url?: string;
  icon_name?: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  created_at?: string;
  updated_at?: string;
}

export interface RuleViolation {
  id: string; // UUID
  rule_id: string; // UUID, foreign key to rules table
  violation_date: string; // ISO string, YYYY-MM-DDTHH:mm:ss.sssZ
  day_of_week: number; // 0 (Sunday) - 6 (Saturday)
  week_number: string; // YYYY-Www, e.g., "2023-W42"
  // created_at is handled by the database (default now())
}

export interface RuleFormValues {
  title: string;
  description: string;
  points_deducted: number;
  dom_points_deducted: number;
  background_image_url?: string;
  background_opacity: number;
  icon_url?: string;
  icon_name?: string;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
}

// Variables needed to create a rule violation.
// rule_id is essential. violation_date, day_of_week, week_number will be generated.
export type CreateRuleViolationVariables = {
  rule_id: string;
};
