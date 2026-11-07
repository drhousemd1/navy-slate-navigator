import { requireCurrentCacheToken, readCacheSnapshot, captureCacheToken, type CacheToken } from '@/data/indexedDB/useIndexedDB';

import { supabase } from '@/integrations/supabase/client';
import { Reward } from '../types';
import { logger } from '@/lib/logger';
import {
  loadRewardsFromDB,
  saveRewardsToDB,
  getLastSyncTimeForRewards } from '@/data/indexedDB/useIndexedDB';

export const REWARDS_QUERY_KEY = ['rewards'];

export const fetchRewards = async (subUserId: string | null, domUserId: string | null, cacheToken: CacheToken | null = captureCacheToken()): Promise<Reward[]> => {
  if (!subUserId && !domUserId) {
    logger.debug("[fetchRewards] No user IDs provided, returning empty array");
    return [];
  }

  logger.debug('[fetchRewards] Fetching rewards with user filtering');

  // Check if we have cached data and if it's fresh (30 minute sync strategy)
  const snapshot = await readCacheSnapshot<Reward[]>('rewards', cacheToken);
      const dataFromDB = snapshot?.data ?? null;
      const lastSync = snapshot?.savedAt ?? null;
  let shouldFetch = true;

  if (lastSync) {
    const timeDiff = Date.now() - new Date(lastSync).getTime();
    if (timeDiff < 1000 * 60 * 30 && dataFromDB !== null) {
      shouldFetch = false;
      logger.debug("[fetchRewards] Using fresh cached data");
      requireCurrentCacheToken(cacheToken);
      return dataFromDB;
    }
  } else if (dataFromDB !== null) {
    shouldFetch = false;
    logger.debug("[fetchRewards] Using existing cached data");
    requireCurrentCacheToken(cacheToken);
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
        requireCurrentCacheToken(cacheToken);
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
        if (dataFromDB !== null) {
          logger.debug('[fetchRewards] Returning cached data due to server error');
          requireCurrentCacheToken(cacheToken);
          return dataFromDB;
        }
        throw error;
      }

      const freshData = data || [];

      // Update cache with fresh data
      try { await saveRewardsToDB(freshData, cacheToken); } catch (error) { requireCurrentCacheToken(cacheToken); logger.warn('Server data loaded, but the device snapshot could not be saved.', error); }

      requireCurrentCacheToken(cacheToken);

      return freshData;
    } catch (error) {
      logger.error('[fetchRewards] Error fetching fresh rewards:', error);

      // Fallback to cached data if available
      if (dataFromDB !== null) {
        logger.debug('[fetchRewards] Falling back to cached data');
        requireCurrentCacheToken(cacheToken);
        return dataFromDB;
      }

      // No cached data available, re-throw the error
      throw error;
    }
  }

  requireCurrentCacheToken(cacheToken);

  return dataFromDB || [];
};
