
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { Reward } from '@/lib/rewardUtils';
import { useRewardsQuery } from '../queries/useRewardsQuery';
import { useBuyReward } from '../mutations/useBuyReward';

export function useRewardsData() {
  const { data: rewards, isLoading, error, refetch: refetchRewards } = useRewardsQuery();
  const buyRewardMutation = useBuyReward();
  
  const saveReward = async (rewardData: Partial<Reward>, currentIndex?: number | null): Promise<Reward | null> => {
    // Not implemented in this iteration - would be a dedicated useCreateReward or useUpdateReward hook
    console.error('Save reward not implemented yet');
    return null;
  };
  
  const deleteReward = async (rewardId: string): Promise<boolean> => {
    // Not implemented in this iteration - would be a dedicated useDeleteReward hook
    console.error('Delete reward not implemented yet');
    return false;
  };
  
  const buyReward = async (reward: Reward): Promise<boolean> => {
    try {
      await buyRewardMutation.mutateAsync({ reward });
      return true;
    } catch (err) {
      console.error('Error in buyReward:', err);
      return false;
    }
  };
  
  return {
    rewards,
    isLoading,
    error,
    saveReward,
    deleteReward,
    buyReward,
    refetchRewards
  };
}
