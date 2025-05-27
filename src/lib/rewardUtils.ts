import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/data/rewards/types';
import { withTimeout, DEFAULT_TIMEOUT_MS, selectWithTimeout } from '@/lib/supabaseUtils'; 
import { PostgrestError } from '@supabase/supabase-js';
import { logQueryPerformance } from '@/lib/react-query-config';
import { logger } from '@/lib/logger';

// Helper to ensure reward data consistency
const processRewardData = (reward: any): Reward => {
  return {
    id: reward.id,
    title: reward.title,
    description: reward.description,
    cost: reward.cost ?? 10,
    supply: reward.supply ?? 0,
    is_dom_reward: reward.is_dom_reward ?? false,
    background_image_url: reward.background_image_url,
    background_opacity: reward.background_opacity ?? 100,
    icon_name: reward.icon_name,
    icon_url: reward.icon_url,
    icon_color: reward.icon_color ?? '#9b87f5',
    title_color: reward.title_color ?? '#FFFFFF',
    subtext_color: reward.subtext_color ?? '#8E9196',
    calendar_color: reward.calendar_color ?? '#7E69AB',
    highlight_effect: reward.highlight_effect ?? false,
    focal_point_x: reward.focal_point_x ?? 50,
    focal_point_y: reward.focal_point_y ?? 50,
    created_at: reward.created_at,
    updated_at: reward.updated_at,
  };
};

// This function is imported as fetchRewardsFromServer in useRewards.ts
export const fetchRewards = async (): Promise<Reward[]> => {
  logger.debug('[fetchRewards] Fetching rewards from server (lib/rewardUtils)');
  const startTime = performance.now();
  try {
    const { data, error } = await selectWithTimeout<Reward>(
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
      const rewardsFromServer = (Array.isArray(data) ? data : (data ? [data] : [])).map(processRewardData);
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
