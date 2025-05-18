
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { deleteReward as deleteRewardFromServer } from '@/lib/rewardUtils';
import { RewardWithId } from '@/data/rewards/types';

export const useDeleteRewardMutation = () => {
  const queryClient = useQueryClient();
  return useDeleteOptimisticMutation<RewardWithId, Error, string>({
    queryClient,
    queryKey: ['rewards'],
    mutationFn: async (id: string) => {
      const success = await deleteRewardFromServer(id);
      if (!success) throw new Error('Failed to delete reward');
    },
    entityName: 'Reward',
  });
};
