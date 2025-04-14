
import { supabase } from "@/integrations/supabase/client";
import { getMondayBasedDay } from "@/lib/utils";

interface Rule {
  id?: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  background_image_url: string | null;
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
  user_id?: string | null;
  is_violated?: boolean;
}

export const createRule = async (ruleData: Partial<Rule>): Promise<Rule | null> => {
  const currentDayOfWeek = getMondayBasedDay();
  
  const newRule: Rule = {
    title: ruleData.title || '',
    description: ruleData.description || null,
    priority: ruleData.priority as 'low' | 'medium' | 'high' || 'medium',
    background_image_url: ruleData.background_image_url || null,
    background_opacity: ruleData.background_opacity || 100,
    icon_url: ruleData.icon_url || null,
    icon_name: ruleData.icon_name || null,
    title_color: ruleData.title_color || '#FFFFFF',
    subtext_color: ruleData.subtext_color || '#FFFFFF',
    calendar_color: ruleData.calendar_color || '#9c7abb',
    icon_color: ruleData.icon_color || '#FFFFFF',
    highlight_effect: ruleData.highlight_effect || false,
    focal_point_x: ruleData.focal_point_x || 50,
    focal_point_y: ruleData.focal_point_y || 50,
    frequency: ruleData.frequency as 'daily' | 'weekly' || 'daily',
    frequency_count: ruleData.frequency_count || 3,
    usage_data: ruleData.usage_data || [0, 0, 0, 0, 0, 0, 0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: ruleData.user_id || null
  };

  const { data, error } = await supabase
    .from('rules')
    .insert(newRule)
    .select()
    .single();

  if (error) {
    console.error('Error creating rule:', error);
    return null;
  }

  return data as Rule;
};

export const updateRule = async (ruleId: string, ruleData: Partial<Rule>): Promise<Rule | null> => {
  const updatedRuleData: Partial<Rule> = {
    ...ruleData,
    frequency: ruleData.frequency as 'daily' | 'weekly' || undefined,
    priority: ruleData.priority as 'low' | 'medium' | 'high' || undefined,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('rules')
    .update(updatedRuleData)
    .eq('id', ruleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating rule:', error);
    return null;
  }

  return data as Rule;
};

export const recordRuleViolation = async (ruleId: string): Promise<boolean> => {
  const today = new Date();
  const jsDayOfWeek = today.getDay();
  const weekNumber = `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`;

  try {
    const { error: violationError } = await supabase
      .from('rule_violations')
      .insert({
        rule_id: ruleId,
        violation_date: today.toISOString(),
        day_of_week: jsDayOfWeek,
        week_number: weekNumber
      });

    if (violationError) throw violationError;

    return true;
  } catch (error) {
    console.error('Error recording rule violation:', error);
    return false;
  }
};
