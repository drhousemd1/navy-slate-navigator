
export interface RuleViolation {
  id: string; // UUID
  rule_id: string; // UUID, foreign key to rules table
  violation_date: string; // ISO string, YYYY-MM-DDTHH:mm:ss.sssZ
  day_of_week: number; // 0 (Sunday) - 6 (Saturday)
  week_number: string; // YYYY-Www, e.g., "2023-W42"
  // created_at is handled by the database (default now())
}

// Variables needed to create a rule violation.
// rule_id is essential. violation_date, day_of_week, week_number will be generated.
export type CreateRuleViolationVariables = {
  rule_id: string;
};
