
import { supabase } from "@/integrations/supabase/client";

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
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  is_violated?: boolean;
  background_images?: (string | null)[] | null;
  carousel_timer?: number;
  usage_data?: number[];
}

export async function fetchRules(): Promise<Rule[]> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user || !user.user) {
    console.error('No user found');
    return [];
  }

  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching rules:', error);
    return [];
  }

  // Ensure the returned data conforms to the Rule interface
  return (data || []).map(rule => ({
    ...rule,
    priority: (rule.priority as 'low' | 'medium' | 'high') || 'medium',
    frequency: (rule.frequency as 'daily' | 'weekly') || 'daily'
  }));
}

export async function getRuleById(id: string): Promise<Rule | null> {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching rule:', error);
    return null;
  }

  // Ensure the returned data conforms to the Rule interface
  return data ? {
    ...data,
    priority: (data.priority as 'low' | 'medium' | 'high') || 'medium',
    frequency: (data.frequency as 'daily' | 'weekly') || 'daily'
  } : null;
}

export async function deleteRule(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('rules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting rule:', error);
    return false;
  }

  return true;
}

export async function updateRuleViolation(id: string, isViolated: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('rules')
    .update({ is_violated: isViolated })
    .eq('id', id);

  if (error) {
    console.error('Error updating rule violation:', error);
    return false;
  }

  // Also record the violation in the history table
  if (isViolated) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (userId) {
      const { error: historyError } = await supabase
        .from('rule_violations')
        .insert({
          rule_id: id,
          user_id: userId,
          violation_date: new Date().toISOString(),
          day_of_week: getMondayBasedDay(),
          week_number: getISOWeekNumber()
        });
        
      if (historyError) {
        console.error('Error recording rule violation history:', historyError);
      }
    }
  }

  return true;
}

// Function to get the current ISO week number (YYYY-WW format)
function getISOWeekNumber(): string {
  const now = new Date();
  const date = new Date(now.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${date.getFullYear()}-${weekNum.toString().padStart(2, '0')}`;
}

export function getMondayBasedDay(): number {
  // Get the current day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const currentDay = new Date().getDay();
  
  // Convert to Monday-based index (0 = Monday, 1 = Tuesday, ..., 6 = Sunday)
  return currentDay === 0 ? 6 : currentDay - 1;
}

export function wasViolatedToday(rule: Rule): boolean {
  if (!rule.is_violated) return false;
  
  const today = new Date().toISOString().split('T')[0];
  const updatedAt = rule.updated_at ? new Date(rule.updated_at).toISOString().split('T')[0] : null;
  
  return today === updatedAt;
}
