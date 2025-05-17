
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { logQueryPerformance } from '@/lib/react-query-config';

export const fetchAllPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  console.log("[fetchAllPunishmentHistory] Starting all history fetch");
  const startTime = performance.now();
  
  try {
    const { data, error } = await supabase
      .from('punishment_history')
      .select('*')
      .order('applied_date', { ascending: false });

    if (error) {
      console.error('[fetchAllPunishmentHistory] Supabase error:', error);
      throw error; // Rethrow for React Query
    }
    
    logQueryPerformance('fetchAllPunishmentHistory', startTime, data?.length);
        
    return data || [];
  } catch (error) {
    console.error('[fetchAllPunishmentHistory] Fetch operation failed:', error);
    throw error; // Ensure error propagates for React Query to handle
  }
};
