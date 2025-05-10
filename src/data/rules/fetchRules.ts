
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { logQueryPerformance, withTimeout } from '@/lib/react-query-config';

export const fetchRules = async (): Promise<Rule[]> => {
  console.log("[fetchRules] Starting rules fetch");
  const startTime = performance.now();
  
  const CACHE_KEY = 'kingdom-app-rules';
  let cachedRules: Rule[] | null = null;
  
  // Try to get cached data first
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      cachedRules = JSON.parse(cachedData);
      console.log(`[fetchRules] Found ${cachedRules.length} cached rules`);
    }
  } catch (parseError) {
    console.error('[fetchRules] Error parsing cached rules:', parseError);
  }
  
  try {
    // Wrap the database query with a timeout to prevent hanging
    const { data, error } = await withTimeout(
      supabase
        .from('rules')
        .select('*')
        .order('created_at', { ascending: false }),
      10000, // 10 second timeout
      { data: [], error: null }
    );
      
    if (error) {
      console.error('[fetchRules] Error:', error);
      // If we have cached data, return it instead of throwing
      if (cachedRules) {
        console.log('[fetchRules] Returning cached rules due to error');
        return cachedRules;
      }
      throw error;
    }
    
    logQueryPerformance('fetchRules', startTime, data?.length);
    
    // Transform and validate the data to ensure it matches the Rule interface
    const validatedRules: Rule[] = (data || []).map(rule => {
      // Validate priority is one of the allowed values, default to 'medium' if not
      const priority = ['low', 'medium', 'high'].includes(rule.priority) 
        ? (rule.priority as 'low' | 'medium' | 'high') 
        : 'medium';
      
      // Ensure usage_data is always a number array
      let usageData: number[];
      
      if (Array.isArray(rule.usage_data)) {
        // Ensure all items in the array are numbers
        usageData = rule.usage_data.map(item => typeof item === 'number' ? item : 0);
      } else {
        // Default to an array of zeros if usage_data is not an array
        usageData = [0, 0, 0, 0, 0, 0, 0];
      }
      
      // Return a properly formatted Rule object
      return {
        id: rule.id,
        title: rule.title,
        description: rule.description,
        priority: priority,
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
        frequency: rule.frequency as 'daily' | 'weekly',
        frequency_count: rule.frequency_count,
        usage_data: usageData,
        created_at: rule.created_at,
        updated_at: rule.updated_at,
        user_id: rule.user_id
      };
    });
    
    // Save to localStorage as a backup cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(validatedRules));
      console.log(`[fetchRules] Saved ${validatedRules.length} rules to localStorage cache`);
    } catch (e) {
      console.warn('[fetchRules] Could not save rules to localStorage:', e);
    }
    
    return validatedRules;
  } catch (error) {
    console.error('[fetchRules] Fetch failed:', error);
    
    // Return cached data if available instead of throwing
    if (cachedRules) {
      console.log('[fetchRules] Returning cached rules due to error');
      return cachedRules;
    }
    
    // If no cached data, return empty array instead of throwing
    console.log('[fetchRules] No cached data available, returning empty array');
    return [];
  }
};
