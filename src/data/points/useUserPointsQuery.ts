import { legacyQueryKey, requireCurrentCacheToken, captureCacheToken, type CacheToken } from '@/data/indexedDB/useIndexedDB';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { loadPointsFromDB, savePointsToDB } from '@/data/indexedDB/useIndexedDB';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

export const USER_POINTS_QUERY_KEY_PREFIX = 'userPoints';

const fetchUserPoints = async (userId: string | null, cacheToken: CacheToken | null = captureCacheToken()): Promise<number> => {
  if (!userId) {
    logger.debug('fetchUserPoints: No userId provided, returning 0.');
    return 0;
  }

  try {
    // Attempt to fetch fresh data from Supabase
    logger.debug(`fetchUserPoints: Fetching points from Supabase for user ${userId}.`);
    const { data: supabaseData, error: supabaseError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();

    if (supabaseError) {
      logger.error(`fetchUserPoints: Supabase error for user ${userId}: ${supabaseError.message}. Falling back to IndexedDB.`);
      const cachedPoints = await loadPointsFromDB(cacheToken, userId);
      logger.debug(`fetchUserPoints: Loaded ${cachedPoints ?? 0} from IndexedDB for fallback.`);
      requireCurrentCacheToken(cacheToken);

      if (cachedPoints === null) throw new Error('Points are unavailable. Reconnect to load your balance.');
      return cachedPoints;
    }

    if (supabaseData) {
      const pointsToSave = supabaseData.points ?? 0;
      logger.debug(`fetchUserPoints: Successfully fetched ${pointsToSave} points from Supabase for user ${userId}. Saving to IndexedDB.`);
      try { await savePointsToDB(pointsToSave, cacheToken, userId); }
      catch (error) {
        requireCurrentCacheToken(cacheToken);
        logger.warn('Fresh points loaded, but the device snapshot could not be saved.', error);
      }
      requireCurrentCacheToken(cacheToken);

      return pointsToSave;
    }

    // Fallback if supabaseData is null but no error (e.g. profile not found if not using .single(), or unexpected case)
    logger.warn(`fetchUserPoints: No data from Supabase for user ${userId} but no error. Attempting IndexedDB fallback.`);
    const cachedPoints = await loadPointsFromDB(cacheToken, userId);
    requireCurrentCacheToken(cacheToken);

    if (cachedPoints === null) throw new Error('Points are unavailable. Reconnect to load your balance.');
    return cachedPoints;

  } catch (error: unknown) {
    logger.error(`fetchUserPoints: Exception for user ${userId}: ${getErrorMessage(error)}. Falling back to IndexedDB.`);
    const cachedPoints = await loadPointsFromDB(cacheToken, userId);
    logger.debug(`fetchUserPoints: Loaded ${cachedPoints ?? 0} from IndexedDB after exception.`);
    requireCurrentCacheToken(cacheToken);

    if (cachedPoints === null) throw new Error('Points are unavailable. Reconnect to load your balance.');
    return cachedPoints;
  }
};

export const useUserPointsQuery = (userId: string | null) => {
  const cacheToken = captureCacheToken();
  return useQuery<number, Error>({
    queryKey: legacyQueryKey([USER_POINTS_QUERY_KEY_PREFIX, userId], cacheToken),
    queryFn: () => fetchUserPoints(userId, cacheToken),
    enabled: !!userId, // Only run query if userId is available
    staleTime: 1000 * 60 * 5, // Keep data fresh for 5 minutes, then refetch on next access
  });
};

// Export alias for backwards compatibility
export const usePoints = useUserPointsQuery;
