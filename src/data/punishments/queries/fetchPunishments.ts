
import { supabase } from '@/integrations/supabase/client';
import { PunishmentData } from '@/contexts/punishments/types';
import { logQueryPerformance } from '@/lib/react-query-config';

export const fetchPunishments = async (): Promise<PunishmentData[]> => {
  console.log("[fetchPunishments] Starting punishments fetch");
  const startTime = performance.now();
  
  // localStorage caching logic removed - React Query persister handles this.
  // const CACHE_KEY = 'kingdom-app-punishments'; 
  
  try {
    const { data, error } = await supabase
      .from('punishments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[fetchPunishments] Supabase error:', error);
      throw error; // Rethrow to be handled by React Query
    }
    
    logQueryPerformance('fetchPunishments', startTime, data?.length);
        
    return data || [];
  } catch (error) {
    // Catching and rethrowing allows React Query to handle it,
    // including retries and offline behavior based on networkMode.
    console.error('[fetchPunishments] Fetch operation failed:', error);
    // localStorage fallback removed.
    // const cachedData = localStorage.getItem(CACHE_KEY);
    // if (cachedData) { ... }
    
    throw error; // Ensure error propagates for React Query to handle
  }
};

