
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';

export const saveRuleToDb = async (ruleData: Partial<Rule>): Promise<Rule> => {
  if (ruleData.id) {
    // Update existing rule
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
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleData.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating rule:', error);
      throw error;
    }

    return data as Rule;
  } else {
    // Create new rule
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

    if (error) {
      console.error('Error creating rule:', error);
      throw error;
    }

    return data as Rule;
  }
};

