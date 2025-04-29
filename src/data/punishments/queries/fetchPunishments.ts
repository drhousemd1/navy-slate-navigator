
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import { logQueryPerformance } from '@/lib/react-query-config';

export const fetchPunishments = async (): Promise<PunishmentData[]> => {
  console.log("[fetchPunishments] Starting punishments fetch");
  const startTime = performance.now();
  
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
    
    return data || [];
  } catch (error) {
    console.error('[fetchPunishments] Fetch failed:', error);
    
    // In case of failure, check browser storage for cached data
    const cachedData = localStorage.getItem('kingdom-app-punishments');
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
