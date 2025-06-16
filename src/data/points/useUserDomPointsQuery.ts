
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { loadDomPointsFromDB, saveDomPointsToDB } from '@/data/indexedDB/useIndexedDB';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

export const USER_DOM_POINTS_QUERY_KEY_PREFIX = 'userDomPoints';

const fetchUserDomPoints = async (userId: string | null): Promise<number> => {
  if (!userId) {
    logger.debug('fetchUserDomPoints: No userId provided, returning 0.');
    return 0;
  }

  try {
    // Attempt to fetch fresh data from Supabase
    logger.debug(`fetchUserDomPoints: Fetching DOM points from Supabase for user ${userId}.`);
    const { data: supabaseData, error: supabaseError } = await supabase
      .from('profiles')
      .select('dom_points')
      .eq('id', userId)
      .single();

    if (supabaseError) {
      logger.error(`fetchUserDomPoints: Supabase error for user ${userId}: ${supabaseError.message}. Falling back to IndexedDB.`);
      const cachedDomPoints = await loadDomPointsFromDB(userId);
      logger.debug(`fetchUserDomPoints: Loaded ${cachedDomPoints ?? 0} DOM points from IndexedDB for fallback.`);
      return cachedDomPoints ?? 0;
    }

    if (supabaseData) {
      const domPointsToSave = supabaseData.dom_points ?? 0;
      logger.debug(`fetchUserDomPoints: Successfully fetched ${domPointsToSave} DOM points from Supabase for user ${userId}. Saving to IndexedDB.`);
      await saveDomPointsToDB(domPointsToSave, userId);
      return domPointsToSave;
    }

    logger.warn(`fetchUserDomPoints: No data from Supabase for user ${userId} but no error. Attempting IndexedDB fallback.`);
    const cachedDomPoints = await loadDomPointsFromDB(userId);
    return cachedDomPoints ?? 0;

  } catch (error: unknown) {
    logger.error(`fetchUserDomPoints: Exception for user ${userId}: ${getErrorMessage(error)}. Falling back to IndexedDB.`);
    const cachedDomPoints = await loadDomPointsFromDB(userId);
    logger.debug(`fetchUserDomPoints: Loaded ${cachedDomPoints ?? 0} DOM points from IndexedDB after exception.`);
    return cachedDomPoints ?? 0;
  }
};

export const useUserDomPointsQuery = (userId: string | null) => {
  return useQuery<number, Error>({
    queryKey: [USER_DOM_POINTS_QUERY_KEY_PREFIX, userId],
    queryFn: () => fetchUserDomPoints(userId),
    enabled: !!userId, // Only run query if userId is available
    staleTime: 1000 * 60 * 5, // Keep data fresh for 5 minutes, then refetch on next access
  });
};

// Export alias for backwards compatibility
export const useDomPoints = useUserDomPointsQuery;
