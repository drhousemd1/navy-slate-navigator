
import { supabase } from "@/integrations/supabase/client";
import { getMondayBasedDay } from "./utils";

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
  background_images?: (string | null)[] | null;
  carousel_timer?: number;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export const fetchRules = async (): Promise<Rule[]> => {
  const { data: rules, error } = await supabase
    .from('rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching rules:', error);
    throw error;
  }

  return rules || [];
};

export const deleteRule = async (ruleId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('rules')
    .delete()
    .eq('id', ruleId);

  if (error) {
    console.error('Error deleting rule:', error);
    throw error;
  }

  return true;
};

export const updateRuleViolation = async (ruleId: string, isViolated: boolean): Promise<boolean> => {
  if (!isViolated) return false;
  
  // Get the current day of week (0 = Monday, 6 = Sunday)
  const dayOfWeek = getMondayBasedDay();
  
  // Calculate week number in YYYY-WW format
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  const weekNumber = Math.floor(diff / oneWeek) + 1;
  const weekYear = `${now.getFullYear()}-${weekNumber.toString().padStart(2, '0')}`;
  
  try {
    // Insert a new rule violation record
    const { error } = await supabase
      .from('rule_violations')
      .insert({
        rule_id: ruleId,
        day_of_week: dayOfWeek,
        week_number: weekYear
      });
      
    if (error) throw error;
    
    // Update the rule's usage_data to mark the day as violated
    const { data: rule } = await supabase
      .from('rules')
      .select('usage_data')
      .eq('id', ruleId)
      .single();
      
    if (rule) {
      const usageData = rule.usage_data || Array(7).fill(0);
      usageData[dayOfWeek] = 1; // Mark as violated for the current day
      
      const { error: updateError } = await supabase
        .from('rules')
        .update({ usage_data: usageData })
        .eq('id', ruleId);
        
      if (updateError) throw updateError;
    }
    
    return true;
  } catch (err) {
    console.error('Error recording rule violation:', err);
    throw err;
  }
};
