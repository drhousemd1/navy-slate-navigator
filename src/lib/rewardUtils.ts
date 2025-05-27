
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/data/rewards/types';
import { selectWithTimeout, DEFAULT_TIMEOUT_MS } from '@/lib/supabaseUtils';
import { PostgrestError } from '@supabase/supabase-js';
import { logQueryPerformance } from '@/lib/react-query-config';
import { logger } from '@/lib/logger';
import { processRewardData } from '@/data/rewards/queries';
import { isPostgrestError, isSupabaseAuthError, isAppError, createAppError, getErrorMessage } from '@/lib/errors';

// Define a type for the raw data structure from the 'rewards' table
// Properties are now required but can be null, reflecting Supabase's return structure for selected columns.
export interface RawSupabaseReward {
  id: string; // uuid
  created_at: string | null; // timestamp with time zone
  updated_at: string | null; // timestamp with time zone
  title: string; // text
  description: string | null; // text
  cost: number; // integer
  supply: number; // integer
  is_dom_reward: boolean | null; // boolean
  title_color: string | null; // text
  subtext_color: string | null; // text
  calendar_color: string | null; // text
  icon_color: string | null; // text
  icon_name: string | null; // text
  background_image_url: string | null; // text
  background_opacity: number | null; // integer
  highlight_effect: boolean | null; // boolean
  focal_point_x: number | null; // integer
  focal_point_y: number | null; // integer
}


export const fetchRewards = async (): Promise<Reward[]> => {
  logger.debug('[fetchRewards] Fetching rewards from server (lib/rewardUtils)');
  const startTime = performance.now();
  try {
    // RowType for selectWithTimeout is RawSupabaseReward.
    // Since 'single' is not true in options, 'data' will be RawSupabaseReward[] | null.
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
      if (isPostgrestError(error)) {
        throw error;
      }
      throw createAppError(getErrorMessage(error), 'FETCH_REWARDS_SUPABASE_ERROR');
    }

    if (data) {
      // Assert data as RawSupabaseReward[] because 'single' was not true.
      // The declared return type of selectWithTimeout is broader than the actual type in this specific call.
      const rewardsArray = data as RawSupabaseReward[];
      const rewardsFromServer = rewardsArray.map(
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
    if (isPostgrestError(error) || isSupabaseAuthError(error) || isAppError(error) || error instanceof Error) {
       throw error;
    }
    throw createAppError(getErrorMessage(error), 'FETCH_REWARDS_EXCEPTION');
  }
};

