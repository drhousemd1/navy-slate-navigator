
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { logQueryPerformance } from '@/lib/react-query-config';
import { logger } from '@/lib/logger';

export const fetchAllPunishmentHistory = async (subUserId: string | null, domUserId: string | null): Promise<PunishmentHistoryItem[]> => {
  if (!subUserId && !domUserId) {
    logger.debug("[fetchAllPunishmentHistory] No user IDs provided, returning empty array");
    return [];
  }

  logger.debug("[fetchAllPunishmentHistory] Starting all history fetch with user filtering");
  const startTime = performance.now();
  
  try {
    // Build user filter - include both sub and dom user IDs for partner sharing
    const userIds = [subUserId, domUserId].filter(Boolean);
    
    if (userIds.length === 0) {
      logger.warn('[fetchAllPunishmentHistory] No valid user IDs for filtering');
      return [];
    }

    const { data, error } = await supabase
      .from('punishment_history')
      .select('*')
      .in('user_id', userIds)
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
