
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { logger } from '@/lib/logger'; // Added logger import

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
      logger.error('Error updating rule:', error); // Replaced console.error
      throw error;
    }

    return data as Rule;
  } else {
    // Create new rule
    const { id, ...ruleWithoutId } = ruleData; // id is unused here, good practice

    if (!ruleWithoutId.title) {
      throw new Error('Rule title is required');
    }

    // Constructing the new rule object with defaults
    const newRulePayload: Omit<Rule, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'usage_data'> & { user_id?: string; usage_data: number[]; created_at?: string; updated_at?: string; } = {
      title: ruleWithoutId.title,
      priority: ruleWithoutId.priority || 'medium',
      background_opacity: ruleWithoutId.background_opacity ?? 100, // Use ?? for explicit undefined check
      icon_color: ruleWithoutId.icon_color || '#FFFFFF',
      title_color: ruleWithoutId.title_color || '#FFFFFF',
      subtext_color: ruleWithoutId.subtext_color || '#FFFFFF',
      calendar_color: ruleWithoutId.calendar_color || '#9c7abb',
      highlight_effect: ruleWithoutId.highlight_effect || false,
      focal_point_x: ruleWithoutId.focal_point_x ?? 50,
      focal_point_y: ruleWithoutId.focal_point_y ?? 50,
      frequency: ruleWithoutId.frequency || 'daily',
      frequency_count: ruleWithoutId.frequency_count ?? 3,
      usage_data: [0, 0, 0, 0, 0, 0, 0], // Default usage_data
      description: ruleWithoutId.description || null, // Ensure null if undefined
      background_image_url: ruleWithoutId.background_image_url || null,
      icon_url: ruleWithoutId.icon_url || null,
      icon_name: ruleWithoutId.icon_name || null,
      // created_at and updated_at are handled by DB or set explicitly before insert
    };
    
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
        newRulePayload.user_id = user.id;
    }


    const { data, error } = await supabase
      .from('rules')
      .insert(newRulePayload) // user_id is now part of newRulePayload
      .select()
      .single();

    if (error) {
      logger.error('Error creating rule:', error); // Replaced console.error
      throw error;
    }

    return data as Rule;
  }
};

