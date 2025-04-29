
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { logQueryPerformance } from '@/lib/react-query-config';

export const fetchRules = async (): Promise<Rule[]> => {
  console.log("[fetchRules] Starting rules fetch");
  const startTime = performance.now();
  
  const CACHE_KEY = 'kingdom-app-rules';
  
  try {
    const { data, error } = await supabase
      .from('rules')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('[fetchRules] Error:', error);
      throw error;
    }
    
    logQueryPerformance('fetchRules', startTime, data?.length);
    
    // Save to localStorage as a backup cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data || []));
      console.log(`[fetchRules] Saved ${data?.length || 0} rules to localStorage cache`);
    } catch (e) {
      console.warn('[fetchRules] Could not save rules to localStorage:', e);
    }
    
    return data || [];
  } catch (error) {
    console.error('[fetchRules] Fetch failed:', error);
    
    // In case of failure, check browser storage for cached data
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      console.log('[fetchRules] Using cached rules data');
      try {
        const parsedData = JSON.parse(cachedData);
        return parsedData;
      } catch (parseError) {
        console.error('[fetchRules] Error parsing cached data:', parseError);
      }
    }
    
    throw error;
  }
};
