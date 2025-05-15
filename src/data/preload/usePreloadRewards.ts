
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchRewards } from '@/data/rewards/queries';
import type { Reward } from '@/contexts/rewards/rewardTypes'; // Assuming Reward is the type exported

export const usePreloadRewards = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const queryKey = ['rewards'];
    const prefetchRewards = async () => {
      const existingData = queryClient.getQueryData<Reward[]>(queryKey);
      
      if (existingData && Array.isArray(existingData) && existingData.length > 0) {
        console.log(`Rewards data (count: ${existingData.length}) already in cache, skipping prefetch.`);
        return;
      }
      try {
        console.log('Prefetching rewards...');
        await queryClient.prefetchQuery({
          queryKey,
          queryFn: fetchRewards,
        });
        const dataAfterPrefetch = queryClient.getQueryData<Reward[]>(queryKey);
        if (dataAfterPrefetch && Array.isArray(dataAfterPrefetch)) {
            console.log(`Rewards preloaded successfully. Count: ${dataAfterPrefetch.length}`);
        } else {
            console.log('Rewards preloaded, but no data returned or data is not an array.');
        }
      } catch (error) {
        console.error('Error prefetching rewards:', error);
      }
    };
    prefetchRewards();
  }, [queryClient]);
};
