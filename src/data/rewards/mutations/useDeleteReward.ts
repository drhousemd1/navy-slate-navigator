
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/data/RewardsDataHandler';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';

export const useDeleteReward = () => {
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<Reward, Error, string>({
    queryClient,
    queryKey: ['rewards'],
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId);
        
      if (error) throw error;
    },
    entityName: 'Reward',
    idField: 'id',
  });
};
