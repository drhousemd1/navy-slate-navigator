
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { Reward } from '@/data/rewards/types';
import { logger } from '@/lib/logger';
import { PostgrestError } from '@supabase/supabase-js';
import { useUserIds } from '@/contexts/UserIdsContext';
import { getRewardsQueryKey } from '../queries';
import { saveRewardsToDB } from '@/data/indexedDB/useIndexedDB';

export const useDeleteReward = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  // Use the standardized query key function - ensure it matches the rewards query
  const rewardsQueryKey = getRewardsQueryKey(subUserId, domUserId);

  return useDeleteOptimisticMutation<Reward, PostgrestError | Error, string>({
    queryClient,
    queryKey: rewardsQueryKey,
    mutationFn: async (rewardId: string) => {
      // Delete related usage records first
      const { error: usageError } = await supabase
        .from('reward_usage')
        .delete()
        .eq('reward_id', rewardId);

      if (usageError) {
        logger.warn(`Failed to delete reward usage history for reward ${rewardId}:`, usageError.message);
      }
      
      // Delete the reward
      const { error } = await supabase.from('rewards').delete().eq('id', rewardId);
      if (error) throw error;
    },
    entityName: 'Reward',
    idField: 'id',
    relatedQueryKey: ['reward-usage'],
    relatedIdField: 'reward_id',
    onSuccessCallback: async (deletedId: string) => {
      // Update the cache immediately after successful deletion
      queryClient.setQueryData<Reward[]>(rewardsQueryKey, (old = []) => {
        const updatedRewards = old.filter(reward => reward.id !== deletedId);
        // Also update IndexedDB cache
        saveRewardsToDB(updatedRewards).catch(err => 
          logger.warn('Failed to update IndexedDB after reward deletion:', err)
        );
        return updatedRewards;
      });
      
      // Force invalidate to ensure consistency
      await queryClient.invalidateQueries({ queryKey: rewardsQueryKey });
      logger.debug('[Delete Reward] Cache updated and invalidated for query key:', rewardsQueryKey);
    }
  });
};
