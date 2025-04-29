
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import { logQueryPerformance } from '@/lib/react-query-config';

export const fetchPunishments = async (): Promise<PunishmentData[]> => {
  console.log("[fetchPunishments] Starting punishments fetch");
  const startTime = performance.now();
  
  const CACHE_KEY = 'kingdom-app-punishments';
  
  try {
    const { data, error } = await supabase
      .from('punishments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[fetchPunishments] Error:', error);
      throw error;
    }
    
    logQueryPerformance('fetchPunishments', startTime, data?.length);
    
    // Store in localStorage as a backup cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data || []));
      console.log(`[fetchPunishments] Saved ${data?.length || 0} punishments to localStorage cache`);
    } catch (e) {
      console.warn('[fetchPunishments] Could not save to localStorage:', e);
    }
    
    return data || [];
  } catch (error) {
    console.error('[fetchPunishments] Fetch failed:', error);
    
    // In case of failure, check browser storage for cached data
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      console.log('[fetchPunishments] Using cached punishments data');
      try {
        const parsedData = JSON.parse(cachedData);
        return parsedData;
      } catch (parseError) {
        console.error('[fetchPunishments] Error parsing cached data:', parseError);
      }
    }
    
    throw error;
  }
};
