
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { startOfWeek, format } from 'date-fns';
import { logQueryPerformance } from '@/lib/react-query-config';

export const fetchCurrentWeekPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  console.log("[fetchCurrentWeekPunishmentHistory] Starting history fetch");
  const startTime = performance.now();
  
  const CACHE_KEY = 'kingdom-app-punishment-history';
  
  try {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
    const startDate = format(startOfCurrentWeek, 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('punishment_history')
      .select('*')
      .gte('applied_date', startDate)
      .lte('applied_date', format(today, 'yyyy-MM-dd'))
      .order('applied_date', { ascending: false });

    if (error) {
      console.error('[fetchCurrentWeekPunishmentHistory] Error:', error);
      throw error;
    }
    
    logQueryPerformance('fetchCurrentWeekPunishmentHistory', startTime, data?.length);
    
    // Store in localStorage as a backup cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data || []));
      console.log(`[fetchCurrentWeekPunishmentHistory] Saved ${data?.length || 0} history items to localStorage cache`);
    } catch (e) {
      console.warn('[fetchCurrentWeekPunishmentHistory] Could not save to localStorage:', e);
    }
    
    return data || [];
  } catch (error) {
    console.error('[fetchCurrentWeekPunishmentHistory] Fetch failed:', error);
    
    // In case of failure, check browser storage for cached data
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      console.log('[fetchCurrentWeekPunishmentHistory] Using cached history data');
      try {
        const parsedData = JSON.parse(cachedData);
        return parsedData;
      } catch (parseError) {
        console.error('[fetchCurrentWeekPunishmentHistory] Error parsing cached data:', parseError);
      }
    }
    
    throw error;
  }
};
