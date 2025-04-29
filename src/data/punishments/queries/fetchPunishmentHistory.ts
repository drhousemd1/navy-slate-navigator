
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { startOfWeek, format } from 'date-fns';
import { logQueryPerformance } from '@/lib/react-query-config';

export const fetchCurrentWeekPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  console.log("[fetchCurrentWeekPunishmentHistory] Starting history fetch");
  const startTime = performance.now();
  
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
      localStorage.setItem('kingdom-app-punishment-history', JSON.stringify(data || []));
    } catch (e) {
      console.warn('[fetchCurrentWeekPunishmentHistory] Could not save to localStorage:', e);
    }
    
    return data || [];
  } catch (error) {
    console.error('[fetchCurrentWeekPunishmentHistory] Fetch failed:', error);
    
    // In case of failure, check browser storage for cached data
    const cachedData = localStorage.getItem('kingdom-app-punishment-history');
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
