
import { Json } from './database.types';
import { Frequency, Priority } from './task.types';

export interface Rule {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  priority: Priority;
  frequency: Frequency;
  frequency_count: number;
  usage_data: Json | null;
  title_color: string | null;
  description_color: string | null;
  highlight_effect: boolean;
  icon_name: string | null;
  icon_color: string | null;
}

export interface RuleViolation {
  id: string;
  rule_id: string;
  user_id: string;
  violation_date: string;
  day_of_week: number;
  week_number: string;
}

export interface CreateRuleInput {
  title: string;
  description?: string | null;
  image_url?: string | null;
  priority?: Priority;
  frequency?: Frequency;
  frequency_count?: number;
  title_color?: string;
  description_color?: string;
  highlight_effect?: boolean;
  icon_name?: string;
  icon_color?: string;
}

export interface UpdateRuleInput extends Partial<CreateRuleInput> {
  id: string;
  usage_data?: Json | null;
}
