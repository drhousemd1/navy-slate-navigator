
import { supabase } from '@/integrations/supabase/client';
import { Rule, RuleViolation } from './types';
import { getMondayBasedDay } from '@/lib/utils';

export const fetchRules = async (): Promise<Rule[]> => {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as Rule[] || []).map(rule => {
    if (!rule.usage_data || !Array.isArray(rule.usage_data) || rule.usage_data.length !== 7) {
      return { ...rule, usage_data: [0, 0, 0, 0, 0, 0, 0] };
    }
    return rule;
  });
};

export const createRule = async (ruleData: Partial<Rule>): Promise<Rule> => {
  const { id, ...ruleWithoutId } = ruleData;

  if (!ruleWithoutId.title) {
    throw new Error('Rule title is required');
  }

  const newRule = {
    title: ruleWithoutId.title,
    priority: ruleWithoutId.priority || 'medium',
    background_opacity: ruleWithoutId.background_opacity || 100,
    icon_color: ruleWithoutId.icon_color || '#FFFFFF',
    title_color: ruleWithoutId.title_color || '#FFFFFF',
    subtext_color: ruleWithoutId.subtext_color || '#FFFFFF',
    calendar_color: ruleWithoutId.calendar_color || '#9c7abb',
    highlight_effect: ruleWithoutId.highlight_effect || false,
    focal_point_x: ruleWithoutId.focal_point_x || 50,
    focal_point_y: ruleWithoutId.focal_point_y || 50,
    frequency: ruleWithoutId.frequency || 'daily',
    frequency_count: ruleWithoutId.frequency_count || 3,
    usage_data: [0, 0, 0, 0, 0, 0, 0],
    ...(ruleWithoutId.description && { description: ruleWithoutId.description }),
    ...(ruleWithoutId.background_image_url && { background_image_url: ruleWithoutId.background_image_url }),
    ...(ruleWithoutId.icon_url && { icon_url: ruleWithoutId.icon_url }),
    ...(ruleWithoutId.icon_name && { icon_name: ruleWithoutId.icon_name }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: (await supabase.auth.getUser()).data.user?.id,
  };

  const { data, error } = await supabase
    .from('rules')
    .insert(newRule)
    .select()
    .single();

  if (error) throw error;
  return data as Rule;
};

export const updateRule = async (ruleData: Partial<Rule>): Promise<Rule> => {
  if (!ruleData.id) {
    throw new Error('Rule ID is required for updates');
  }

  const { data, error } = await supabase
    .from('rules')
    .update({
      title: ruleData.title,
      description: ruleData.description,
      priority: ruleData.priority,
      background_image_url: ruleData.background_image_url,
      background_opacity: ruleData.background_opacity,
      icon_url: ruleData.icon_url,
      icon_name: ruleData.icon_name,
      title_color: ruleData.title_color,
      subtext_color: ruleData.subtext_color,
      calendar_color: ruleData.calendar_color,
      icon_color: ruleData.icon_color,
      highlight_effect: ruleData.highlight_effect,
      focal_point_x: ruleData.focal_point_x,
      focal_point_y: ruleData.focal_point_y,
      frequency: ruleData.frequency,
      frequency_count: ruleData.frequency_count,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ruleData.id)
    .select()
    .single();

  if (error) throw error;
  return data as Rule;
};

export const deleteRule = async (ruleId: string): Promise<void> => {
  const { error } = await supabase
    .from('rules')
    .delete()
    .eq('id', ruleId);

  if (error) throw error;
};

export const recordRuleViolation = async (ruleId: string): Promise<{ updatedRule: Rule, violation: RuleViolation }> => {
  // Get current rule
  const { data: ruleData, error: ruleError } = await supabase
    .from('rules')
    .select('*')
    .eq('id', ruleId)
    .single();

  if (ruleError) throw ruleError;

  const rule = ruleData as Rule;

  // Update usage data for current day of week
  const currentDayOfWeek = getMondayBasedDay();
  const newUsageData = [...(rule.usage_data || [0, 0, 0, 0, 0, 0, 0])];
  newUsageData[currentDayOfWeek] = 1;

  // Update rule with new usage data
  const { data: updatedRuleData, error: updateError } = await supabase
    .from('rules')
    .update({
      usage_data: newUsageData,
      updated_at: new Date().toISOString()
    })
    .eq('id', ruleId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Record violation entry
  const today = new Date();
  const jsDayOfWeek = today.getDay();

  const violationData = {
    rule_id: ruleId,
    violation_date: today.toISOString(),
    day_of_week: jsDayOfWeek,
    week_number: `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`
  };

  const { data: violationRecord, error: violationError } = await supabase
    .from('rule_violations')
    .insert(violationData)
    .select()
    .single();

  if (violationError) {
    // Log error but still return updated rule
    console.error('Error recording rule violation:', violationError);
    return {
      updatedRule: updatedRuleData as Rule,
      violation: { ...violationData, id: 'error' }
    };
  }

  return {
    updatedRule: updatedRuleData as Rule,
    violation: violationRecord as RuleViolation
  };
};
