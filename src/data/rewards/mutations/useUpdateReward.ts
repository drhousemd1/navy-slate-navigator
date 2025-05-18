
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/data/RewardsDataHandler';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';

export type UpdateRewardVariables = { rewardId: string } & Partial<Omit<Reward, 'id'>>;

export const useUpdateReward = () => {
  const queryClient = useQueryClient();

  return useUpdateOptimisticMutation<Reward, Error, UpdateRewardVariables>({
    queryClient,
    queryKey: ['rewards'],
    mutationFn: async (variables: UpdateRewardVariables) => {
      const { rewardId, ...updates } = variables;
      
      const { data, error } = await supabase
        .from('rewards')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', rewardId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Reward update failed.');
      
      return data as Reward;
    },
    entityName: 'Reward',
    idField: 'id',
    getItemId: (variables) => variables.rewardId,
  });
};
