
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/data/rewards/types';
import { withTimeout, DEFAULT_TIMEOUT_MS, selectWithTimeout } from '@/lib/supabaseUtils'; 
import { PostgrestError } from '@supabase/supabase-js'; // Keep direct import for type clarity if not re-exporting from errors.ts
import { logQueryPerformance } from '@/lib/react-query-config';
import { logger } from '@/lib/logger';
import { processRewardData } from '@/data/rewards/queries'; 
import { isPostgrestError, isSupabaseAuthError, isAppError, createAppError, getErrorMessage, CaughtError } from '@/lib/errors';

// Define a type for the raw data structure from the 'rewards' table
export interface RawSupabaseReward {
  id: string; // uuid
  created_at?: string | null; // timestamp with time zone
  updated_at?: string | null; // timestamp with time zone
  title: string; // text
  description?: string | null; // text
  cost: number; // integer
  supply: number; // integer
  is_dom_reward?: boolean | null; // boolean
  title_color?: string | null; // text
  subtext_color?: string | null; // text
  calendar_color?: string | null; // text
  icon_color?: string | null; // text
  icon_name?: string | null; // text
  background_image_url?: string | null; // text
  background_opacity?: number | null; // integer
  highlight_effect?: boolean | null; // boolean
  focal_point_x?: number | null; // integer
  focal_point_y?: number | null; // integer
}


export const fetchRewards = async (): Promise<Reward[]> => {
  logger.debug('[fetchRewards] Fetching rewards from server (lib/rewardUtils)');
  const startTime = performance.now();
  try {
    // Corrected: RowType for selectWithTimeout should be RawSupabaseReward, not RawSupabaseReward[]
    // This will make `data` be of type `RawSupabaseReward[] | null` when `single` is false.
    const { data, error } = await selectWithTimeout<RawSupabaseReward>(
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
      // data is now RawSupabaseReward[] here, which is what .map expects
      const rewardsFromServer = data.map(
        (item: RawSupabaseReward) => processRewardData(item)
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

