
import { useCallback } from 'react';
import { useRewards } from '@/data/queries/useRewards';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { loadRewardsFromDB } from '../indexedDB/useIndexedDB';
import { checkAndPerformRewardsResets } from '@/lib/rewardsUtils';
import { REWARDS_QUERY_KEY } from '@/data/rewards/queries';

export const useRewardsData = () => {
  const queryClient = useQueryClient();
  const { 
    data: rewards = [], 
    isLoading, 
    error, 
    refetch,
    isUsingCachedData = false
  } = useRewards();

  // Enhanced rewards loading with reset check and complete cache invalidation
  const checkAndReloadRewards = useCallback(async () => {
    try {
      logger.debug('[useRewardsData] Checking for rewards resets');
      
      const resetPerformed = await checkAndPerformRewardsResets();
      
      if (resetPerformed) {
        logger.debug('[useRewardsData] Resets performed, invalidating cache and reloading fresh data');
        
        // Force complete cache invalidation for rewards
        await queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
        
        // Reload fresh data from IndexedDB after resets
        const freshData = await loadRewardsFromDB();
        
        if (freshData && Array.isArray(freshData)) {
          // Update React Query cache with fresh data
          queryClient.setQueryData(REWARDS_QUERY_KEY, freshData);
          logger.debug('[useRewardsData] Updated cache with fresh reset data');
        }
        
        // Force a refetch to ensure we have the latest data from server
        await refetch();
      }
    } catch (error) {
      logger.error('[useRewardsData] Error during reset check:', error);
    }
  }, [queryClient, refetch]);

  return {
    rewards,
    isLoading,
    error,
    isUsingCachedData,
    refetch,
    checkAndReloadRewards
  };
};
