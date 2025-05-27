
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/data/rewards/types'; // Assuming this type is available
// If Reward type is defined elsewhere (e.g. in queries.ts if types.ts not available) adjust import
import { withTimeout, DEFAULT_TIMEOUT_MS, selectWithTimeout } from '@/lib/supabaseUtils'; 
import { PostgrestError } from '@supabase/supabase-js';
import { logQueryPerformance } from '@/lib/react-query-config';
import { logger } from '@/lib/logger';
// Import the consolidated processRewardData and its RawSupabaseReward type (or its definition if local)
import { processRewardData } from '@/data/rewards/queries'; 
// RawSupabaseReward is locally defined in queries.ts, so we don't import it here.
// We'll cast the supabase response to 'any' then to RawSupabaseReward in the calling function.
// Or, ideally, queries.ts would export RawSupabaseReward if it's locally defined there.
// For now, fetchRewards below will expect `any` from selectWithTimeout then cast.

// Helper to ensure reward data consistency (REMOVED - consolidated into data/rewards/queries.ts)
// const processRewardData = (reward: any): Reward => { ... };

// This function is imported as fetchRewardsFromServer in useRewards.ts
export const fetchRewards = async (): Promise<Reward[]> => {
  logger.debug('[fetchRewards] Fetching rewards from server (lib/rewardUtils)');
  const startTime = performance.now();
  try {
    // Since RawSupabaseReward is local to queries.ts, we'll fetch as 'any' and let processRewardData handle it
    // Ideally, selectWithTimeout would be typed with RawSupabaseReward if it was exportable
    const { data, error } = await selectWithTimeout<any>( // Temporarily 'any'
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
      throw error;
    }

    if (data) {
      // The processRewardData from queries.ts expects RawSupabaseReward.
      // We cast 'data' items to 'any' first, then implicitly to RawSupabaseReward by the function call.
      const rewardsFromServer = (Array.isArray(data) ? data : (data ? [data] : [])).map(
        (item: any) => processRewardData(item as any) // Cast to any for processRewardData
      );
      logQueryPerformance('fetchRewards (server-success)', startTime, rewardsFromServer.length);
      return rewardsFromServer;
    }
    logQueryPerformance('fetchRewards (server-empty)', startTime, 0);
    return [];
  } catch (error) {
    logger.error('[fetchRewards] Error in fetchRewards process:', error);
    logQueryPerformance('fetchRewards (fetch-exception)', startTime);
    throw error; // Rethrow to be handled by React Query, which might use cache
  }
};
