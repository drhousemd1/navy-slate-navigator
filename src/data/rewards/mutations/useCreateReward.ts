
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/data/RewardsDataHandler';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';

export type CreateRewardVariables = Omit<Reward, 'id' | 'created_at' | 'updated_at'>;

export const useCreateReward = () => {
  const queryClient = useQueryClient();

  return useCreateOptimisticMutation<Reward, Error, CreateRewardVariables>({
    queryClient,
    queryKey: ['rewards'],
    mutationFn: async (variables: CreateRewardVariables) => {
      const { data, error } = await supabase
        .from('rewards')
        .insert({ ...variables })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Reward creation failed.');
      
      return data as Reward;
    },
    entityName: 'Reward',
    createOptimisticItem: (variables, optimisticId) => {
      const now = new Date().toISOString();
      return {
        id: optimisticId,
        created_at: now,
        updated_at: now,
        ...variables,
      } as Reward;
    },
  });
};
