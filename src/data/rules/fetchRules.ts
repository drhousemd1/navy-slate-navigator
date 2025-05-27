
import { supabase } from '@/integrations/supabase/client';
import { Rule, RawSupabaseRule } from './types'; // Import new types
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors'; // Import getErrorMessage

// Helper to safely parse JSON data, especially for usage_data
function parseJsonDataForRules<T>(jsonData: unknown, defaultValue: T): T {
  if (jsonData === null || jsonData === undefined) {
    return defaultValue;
  }
  try {
    if (typeof jsonData === 'object') { // Already parsed by Supabase
      return jsonData as T;
    }
    if (typeof jsonData === 'string') { // Needs parsing
      return JSON.parse(jsonData) as T;
    }
    logger.warn('[parseJsonDataForRules] Unexpected data type for JSON parsing:', typeof jsonData, jsonData);
    return defaultValue;
  } catch (error: unknown) {
    logger.error('[parseJsonDataForRules] Error parsing JSON data:', getErrorMessage(error), jsonData, error);
    return defaultValue;
  }
}


export const parseRuleData = (rawRule: RawSupabaseRule): Rule => {
  return {
    id: rawRule.id,
    user_id: rawRule.user_id,
    title: rawRule.title,
    description: rawRule.description ?? undefined,
    priority: (rawRule.priority as 'low' | 'medium' | 'high') || 'medium',
    frequency: (rawRule.frequency as 'daily' | 'weekly') || 'daily',
    frequency_count: rawRule.frequency_count || 1,
    icon_name: rawRule.icon_name ?? undefined,
    icon_url: rawRule.icon_url ?? undefined,
    icon_color: rawRule.icon_color || '#FFFFFF',
    title_color: rawRule.title_color || '#FFFFFF',
    subtext_color: rawRule.subtext_color || '#D1D5DB',
    calendar_color: rawRule.calendar_color || '#9c7abb',
    background_image_url: rawRule.background_image_url ?? undefined,
    background_opacity: rawRule.background_opacity || 100,
    highlight_effect: rawRule.highlight_effect || false,
    focal_point_x: rawRule.focal_point_x || 50,
    focal_point_y: rawRule.focal_point_y || 50,
    usage_data: parseJsonDataForRules(rawRule.usage_data, []),
    background_images: rawRule.background_images ?? null,
    created_at: rawRule.created_at,
    updated_at: rawRule.updated_at,
  };
};

export const fetchRules = async (userId?: string): Promise<Rule[]> => {
  if (!userId) {
    logger.debug('fetchRules: No user ID provided, returning empty array.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching rules:', error.message);
      throw error;
    }
    
    logger.debug('Fetched raw rules:', data);
    const parsedRules = (data || []).map(rule => parseRuleData(rule as RawSupabaseRule));
    logger.debug('Parsed rules:', parsedRules);
    return parsedRules;

  } catch (error: unknown) {
    logger.error('Unexpected error in fetchRules:', getErrorMessage(error), error);
    // Depending on how this is used, you might want to rethrow or return empty
    throw error; // Or return [] and handle UI appropriately
  }
};
