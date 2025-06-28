
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { Reward } from '@/data/rewards/types';
import { logger } from '@/lib/logger';
import { PostgrestError } from '@supabase/supabase-js';
import { useUserIds } from '@/contexts/UserIdsContext';
import { getRewardsQueryKey } from '../queries';

export const useDeleteReward = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  // Use the standardized query key function - ensure it matches the rewards query
  const rewardsQueryKey = getRewardsQueryKey(subUserId, domUserId);

  return useDeleteOptimisticMutation<Reward, PostgrestError | Error, string>({
    queryClient,
    queryKey: rewardsQueryKey,
    mutationFn: async (rewardId: string) => {
      const { error: usageError } = await supabase
        .from('reward_usage')
        .delete()
        .eq('reward_id', rewardId);

      if (usageError) {
        logger.warn(`Failed to delete reward usage history for reward ${rewardId}:`, usageError.message);
      }
      
      const { error } = await supabase.from('rewards').delete().eq('id', rewardId);
      if (error) throw error;
    },
    entityName: 'Reward',
    idField: 'id',
    relatedQueryKey: ['reward-usage'],
    relatedIdField: 'reward_id',
    onSuccessCallback: async () => {
      // Force invalidate the exact same query key that useRewardsQuery uses
      await queryClient.invalidateQueries({ queryKey: rewardsQueryKey });
      logger.debug('[Delete Reward] Cache invalidated for query key:', rewardsQueryKey);
    }
  });
};
