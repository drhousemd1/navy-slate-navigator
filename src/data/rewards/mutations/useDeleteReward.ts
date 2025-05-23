import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { Reward } from '@/data/rewards/types';
// Removed: import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager';

const REWARDS_QUERY_KEY = ['rewards'];

export const useDeleteReward = () => {
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<Reward, Error, string>({
    queryClient,
    queryKey: REWARDS_QUERY_KEY, // Replaced [...CRITICAL_QUERY_KEYS.REWARDS]
    mutationFn: async (rewardId: string) => {
      const { error: usageError } = await supabase
        .from('reward_usage')
        .delete()
        .eq('reward_id', rewardId);

      if (usageError) {
        console.warn(`Failed to delete reward usage history for reward ${rewardId}:`, usageError.message);
      }
      
      const { error } = await supabase.from('rewards').delete().eq('id', rewardId);
      if (error) throw error;
    },
    entityName: 'Reward',
    idField: 'id',
  });
};
