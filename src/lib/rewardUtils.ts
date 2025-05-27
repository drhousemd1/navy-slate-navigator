import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/data/rewards/types';
import { withTimeout, DEFAULT_TIMEOUT_MS, selectWithTimeout } from '@/lib/supabaseUtils'; 
import { PostgrestError } from '@supabase/supabase-js'; // Keep direct import for type clarity if not re-exporting from errors.ts
import { logQueryPerformance } from '@/lib/react-query-config';
import { logger } from '@/lib/logger';
import { processRewardData } from '@/data/rewards/queries'; 
import { isPostgrestError, isSupabaseAuthError, isAppError, createAppError, getErrorMessage, CaughtError } from '@/lib/errors';


export const fetchRewards = async (): Promise<Reward[]> => {
  logger.debug('[fetchRewards] Fetching rewards from server (lib/rewardUtils)');
  const startTime = performance.now();
  try {
    const { data, error } = await selectWithTimeout<any>(
      supabase,
      'rewards',
      {
        order: ['created_at', { ascending: false }],
        timeoutMs: DEFAULT_TIMEOUT_MS
      }
    );

    if (error) {
      logger.error('[fetchRewards] Supabase error fetching rewards:', error);
      logQueryPerformance('fetchRewards (server-error)', startTime);
      // Ensure error is a PostgrestError or compatible
      if (isPostgrestError(error)) {
        throw error; // Already an Error instance
      }
      // If not, wrap it, though selectWithTimeout should return PostgrestError
      throw createAppError(getErrorMessage(error), 'FETCH_REWARDS_SUPABASE_ERROR');
    }

    if (data) {
      const rewardsFromServer = (Array.isArray(data) ? data : (data ? [data] : [])).map(
        (item: any) => processRewardData(item as any)
      );
      logQueryPerformance('fetchRewards (server-success)', startTime, rewardsFromServer.length);
      return rewardsFromServer;
    }
    logQueryPerformance('fetchRewards (server-empty)', startTime, 0);
    return [];
  } catch (error: unknown) {
    logger.error('[fetchRewards] Error in fetchRewards process:', getErrorMessage(error));
    logQueryPerformance('fetchRewards (fetch-exception)', startTime);
    // Ensure an Error instance is thrown for React Query
    if (isPostgrestError(error) || isSupabaseAuthError(error) || isAppError(error) || error instanceof Error) {
       throw error;
    }
    throw createAppError(getErrorMessage(error), 'FETCH_REWARDS_EXCEPTION');
  }
};
