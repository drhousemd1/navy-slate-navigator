import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { Reward } from '@/data/rewards/types'; // Assuming Reward type is here
import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager';

export const useDeleteReward = () => {
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<Reward, Error, string>({
    queryClient,
    queryKey: CRITICAL_QUERY_KEYS.REWARDS,
    mutationFn: async (rewardId: string) => {
      // Before deleting a reward, consider related data like 'reward_usage'.
      // If reward_usage has a foreign key to rewards with ON DELETE CASCADE, DB handles it.
      // Otherwise, delete related records here first.
      // For now, assuming cascade or manual cleanup elsewhere if needed.
      const { error: usageError } = await supabase
        .from('reward_usage')
        .delete()
        .eq('reward_id', rewardId);

      if (usageError) {
        // Log or handle partial failure, but proceed with reward deletion
        console.warn(`Failed to delete reward usage history for reward ${rewardId}:`, usageError.message);
      }
      
      const { error } = await supabase.from('rewards').delete().eq('id', rewardId);
      if (error) throw error;
      // No data is returned on successful delete
    },
    entityName: 'Reward',
    idField: 'id',
    // If reward_usage list is also managed optimistically in cache with a different queryKey:
    // relatedQueryKey: ['reward_usage_history'], // example
    // relatedIdField: 'reward_id', // example
  });
};
