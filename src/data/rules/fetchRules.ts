
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';

// Converts DB rule data to Rule interface, with priority and frequency typing
const convertDbRuleToRuleInterface = (rule: any): Rule => ({
  id: rule.id,
  title: rule.title,
  description: rule.description,
  priority: (rule.priority as string || 'medium') as 'low' | 'medium' | 'high',
  background_image_url: rule.background_image_url,
  background_opacity: rule.background_opacity,
  icon_url: rule.icon_url,
  icon_name: rule.icon_name,
  title_color: rule.title_color,
  subtext_color: rule.subtext_color,
  calendar_color: rule.calendar_color,
  icon_color: rule.icon_color,
  highlight_effect: rule.highlight_effect,
  focal_point_x: rule.focal_point_x,
  focal_point_y: rule.focal_point_y,
  frequency: (rule.frequency as string || 'daily') as 'daily' | 'weekly',
  frequency_count: rule.frequency_count,
  usage_data: Array.isArray(rule.usage_data) ? 
    rule.usage_data.map((val: any) => Number(val)) : 
    [0, 0, 0, 0, 0, 0, 0],
  created_at: rule.created_at,
  updated_at: rule.updated_at,
  user_id: rule.user_id
});

export const fetchRules = async (): Promise<Rule[]> => {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching rules:', error);
    throw error;
  }

  return (data || []).map(convertDbRuleToRuleInterface);
};

