
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { Reward } from '@/data/rewards/types';
import { logger } from '@/lib/logger';
import { PostgrestError } from '@supabase/supabase-js';

const REWARDS_QUERY_KEY = ['rewards'];

export const useDeleteReward = () => {
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<Reward, PostgrestError | Error, string>({
    queryClient,
    queryKey: REWARDS_QUERY_KEY,
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
  });
};
