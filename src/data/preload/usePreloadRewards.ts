
import { queryClient } from '../queryClient';
import { loadRewardsFromDB } from '../indexedDB/useIndexedDB';
import { Reward } from '@/lib/rewardUtils';

export const usePreloadRewards = () => {
  return async () => {
    try {
      // Check if data already exists in cache
      const existingData = queryClient.getQueryData(['rewards']);
      
      if (!existingData) {
        // Try to load from IndexedDB
        const localData = await loadRewardsFromDB();
        
        if (localData && localData.length > 0) {
          // Set the data in the query cache
          queryClient.setQueryData(['rewards'], localData);
          console.log('[Preload] Loaded rewards from IndexedDB:', localData.length);
        }
      }
    } catch (error) {
      console.error('[Preload] Error preloading rewards:', error);
    }
  };
};
