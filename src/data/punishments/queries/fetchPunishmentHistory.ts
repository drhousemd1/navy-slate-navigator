
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { startOfWeek, format } from 'date-fns';
import { logQueryPerformance } from '@/lib/react-query-config';

export const fetchCurrentWeekPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  console.log("[fetchCurrentWeekPunishmentHistory] Starting history fetch");
  const startTime = performance.now();

  // localStorage caching logic removed - React Query persister handles this.
  // const CACHE_KEY = 'kingdom-app-punishment-history';
  
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
      console.error('[fetchCurrentWeekPunishmentHistory] Supabase error:', error);
      throw error; // Rethrow for React Query
    }
    
    logQueryPerformance('fetchCurrentWeekPunishmentHistory', startTime, data?.length);
        
    return data || [];
  } catch (error) {
    console.error('[fetchCurrentWeekPunishmentHistory] Fetch operation failed:', error);
    // localStorage fallback removed.
    // const cachedData = localStorage.getItem(CACHE_KEY);
    // if (cachedData) { ... }
        
    throw error; // Ensure error propagates for React Query to handle
  }
};

