
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { logQueryPerformance } from '@/lib/react-query-config';
import { logger } from '@/lib/logger'; // Added logger

export const fetchAllPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  logger.debug("[fetchAllPunishmentHistory] Starting all history fetch");
  const startTime = performance.now();
  
  try {
    const { data, error } = await supabase
      .from('punishment_history')
      .select('*')
      .order('applied_date', { ascending: false });

    if (error) {
      logger.error('[fetchAllPunishmentHistory] Supabase error:', error);
      throw error; // Rethrow for React Query
    }
    
    logQueryPerformance('fetchAllPunishmentHistory', startTime, data?.length);
        
    return data || [];
  } catch (error) {
    logger.error('[fetchAllPunishmentHistory] Fetch operation failed:', error);
    throw error; // Ensure error propagates for React Query to handle
  }
};

