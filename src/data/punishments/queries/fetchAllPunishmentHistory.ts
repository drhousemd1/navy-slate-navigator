
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
// logQueryPerformance import was from '@/lib/react-query-config', assuming it's now from './queryUtils' or similar local util
// If logQueryPerformance is still needed and is in react-query-config, it would also need logger.
// For now, assuming it's from local queryUtils which now uses logger.
import { logQueryPerformance } from './queryUtils'; // Adjusted import if it's moved/local
import { logger } from '@/lib/logger'; // Added logger import

export const fetchAllPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  logger.log("[fetchAllPunishmentHistory] Starting all history fetch"); // Replaced console.log
  const startTime = performance.now();
  
  try {
    const { data, error } = await supabase
      .from('punishment_history')
      .select('*')
      .order('applied_date', { ascending: false });

    if (error) {
      logger.error('[fetchAllPunishmentHistory] Supabase error:', error); // Replaced console.error
      throw error; // Rethrow for React Query
    }
    
    logQueryPerformance('fetchAllPunishmentHistory', startTime, data?.length);
        
    return data || [];
  } catch (error) {
    logger.error('[fetchAllPunishmentHistory] Fetch operation failed:', error); // Replaced console.error
    throw error; // Ensure error propagates for React Query to handle
  }
};

