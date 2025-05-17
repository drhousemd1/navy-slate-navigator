
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { logQueryPerformance } from '@/lib/react-query-config';

export const fetchRules = async (): Promise<Rule[]> => {
  console.log("[fetchRules] Starting rules fetch");
  const startTime = performance.now();
  
  // const CACHE_KEY = 'kingdom-app-rules'; // No longer using localStorage for this
  
  try {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('[fetchRules] Error fetching from Supabase:', error);
      throw error; // Let React Query handle this error (e.g., serve stale data from cache)
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
    
    // localStorage.setItem(CACHE_KEY, JSON.stringify(validatedRules)); // Removed localStorage save
    // console.log(`[fetchRules] Saved ${validatedRules.length} rules to localStorage cache`); // Removed
    
    return validatedRules;
  } catch (error) {
    console.error('[fetchRules] Fetch process failed:', error);
    // localStorage related fallback removed. React Query will handle error states and cache.
    // const cachedData = localStorage.getItem(CACHE_KEY);
    // if (cachedData) {
    //   console.log('[fetchRules] Using cached rules data from localStorage');
    //   try {
    //     const parsedData = JSON.parse(cachedData);
    //     return parsedData;
    //   } catch (parseError) {
    //     console.error('[fetchRules] Error parsing cached data from localStorage:', parseError);
    //   }
    // }
    
    throw error; // Re-throw the error to be handled by React Query
  }
};
