
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { loadPointsFromDB, savePointsToDB } from '@/data/indexedDB/useIndexedDB';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

export const USER_POINTS_QUERY_KEY_PREFIX = 'userPoints';

const fetchUserPoints = async (userId: string | null): Promise<number> => {
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
      const cachedPoints = await loadPointsFromDB(userId);
      logger.debug(`fetchUserPoints: Loaded ${cachedPoints ?? 0} from IndexedDB for fallback.`);
      return cachedPoints ?? 0;
    }

    if (supabaseData) {
      const pointsToSave = supabaseData.points ?? 0;
      logger.debug(`fetchUserPoints: Successfully fetched ${pointsToSave} points from Supabase for user ${userId}. Saving to IndexedDB.`);
      await savePointsToDB(pointsToSave, userId);
      return pointsToSave;
    }
    
    // Fallback if supabaseData is null but no error (e.g. profile not found if not using .single(), or unexpected case)
    logger.warn(`fetchUserPoints: No data from Supabase for user ${userId} but no error. Attempting IndexedDB fallback.`);
    const cachedPoints = await loadPointsFromDB(userId);
    return cachedPoints ?? 0;

  } catch (error: unknown) {
    logger.error(`fetchUserPoints: Exception for user ${userId}: ${getErrorMessage(error)}. Falling back to IndexedDB.`);
    const cachedPoints = await loadPointsFromDB(userId);
    logger.debug(`fetchUserPoints: Loaded ${cachedPoints ?? 0} from IndexedDB after exception.`);
    return cachedPoints ?? 0;
  }
};

export const useUserPointsQuery = (userId: string | null) => {
  return useQuery<number, Error>({
    queryKey: [USER_POINTS_QUERY_KEY_PREFIX, userId],
    queryFn: () => fetchUserPoints(userId),
    enabled: !!userId, // Only run query if userId is available
    staleTime: 1000 * 60 * 5, // Keep data fresh for 5 minutes, then refetch on next access
  });
};

// Export alias for backwards compatibility
export const usePoints = useUserPointsQuery;
