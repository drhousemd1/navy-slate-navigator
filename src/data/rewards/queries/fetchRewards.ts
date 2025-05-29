
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '../types';
import { logger } from '@/lib/logger';
import { 
  loadRewardsFromDB, 
  saveRewardsToDB, 
  getLastSyncTimeForRewards, 
  setLastSyncTimeForRewards 
} from '@/data/indexedDB/useIndexedDB';

export const REWARDS_QUERY_KEY = ['rewards'];

export const fetchRewards = async (subUserId: string | null, domUserId: string | null): Promise<Reward[]> => {
  if (!subUserId && !domUserId) {
    logger.debug("[fetchRewards] No user IDs provided, returning empty array");
    return [];
  }

  logger.debug('[fetchRewards] Fetching rewards with user filtering');
  
  // Check if we have cached data and if it's fresh (30 minute sync strategy)
  const dataFromDB = await loadRewardsFromDB(); 
  const lastSync = await getLastSyncTimeForRewards();
  let shouldFetch = true;

  if (lastSync) {
    const timeDiff = Date.now() - new Date(lastSync).getTime();
    if (timeDiff < 1000 * 60 * 30 && dataFromDB && dataFromDB.length > 0) {
      shouldFetch = false;
      logger.debug("[fetchRewards] Using fresh cached data");
      return dataFromDB;
    }
  } else if (dataFromDB && dataFromDB.length > 0) {
    shouldFetch = false;
    logger.debug("[fetchRewards] Using existing cached data");
    return dataFromDB;
  }

  // If we should fetch fresh data or have no cached data
  if (shouldFetch) {
    try {
      logger.debug("[fetchRewards] Fetching fresh data from server");
      
      // Build user filter - include both sub and dom user IDs for partner sharing
      const userIds = [subUserId, domUserId].filter(Boolean);
      
      if (userIds.length === 0) {
        logger.warn('[fetchRewards] No valid user IDs for filtering');
        return dataFromDB || [];
      }

      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('[fetchRewards] Supabase error fetching rewards:', error);
        // Return cached data if available, otherwise throw
        if (dataFromDB && dataFromDB.length > 0) {
          logger.debug('[fetchRewards] Returning cached data due to server error');
          return dataFromDB;
        }
        throw error;
      }

      const freshData = data || [];
      
      // Update cache with fresh data
      await saveRewardsToDB(freshData);
      await setLastSyncTimeForRewards(new Date().toISOString());
      
      return freshData;
    } catch (error) {
      logger.error('[fetchRewards] Error fetching fresh rewards:', error);
      
      // Fallback to cached data if available
      if (dataFromDB && dataFromDB.length > 0) {
        logger.debug('[fetchRewards] Falling back to cached data');
        return dataFromDB;
      }
      
      // No cached data available, re-throw the error
      throw error;
    }
  }

  return dataFromDB || [];
};
