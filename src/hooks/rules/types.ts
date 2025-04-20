
export interface Rule {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  background_image_url?: string | null;
  background_opacity: number;
  icon_url?: string | null;
  icon_name?: string | null;
  title_color: string;
  subtext_color: string;
  calendar_color: string;
  icon_color: string;
  highlight_effect: boolean;
  focal_point_x: number;
  focal_point_y: number;
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  usage_data: number[];
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export interface RuleViolation {
  id?: string;
  rule_id: string;
  violation_date: string;
  day_of_week: number;
  week_number: string;
}

// Query keys constants
export const RULES_KEY = 'rules';
export const RULE_VIOLATIONS_KEY = 'rule_violations';
