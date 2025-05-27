
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
import { Reward, CreateRewardVariables } from '@/data/rewards/types';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

const REWARDS_QUERY_KEY = ['rewards'];

export const useCreateReward = () => {
  const queryClient = useQueryClient();

  return useCreateOptimisticMutation<Reward, Error, CreateRewardVariables>({
    queryClient,
    queryKey: REWARDS_QUERY_KEY,
    mutationFn: async (variables: CreateRewardVariables) => {
      try {
        const { data, error } = await supabase
          .from('rewards')
          .insert({ ...variables }) 
          .select()
          .single();
        
        if (error) throw error;
        if (!data) throw new Error('Reward creation failed, no data returned.');
        return data as Reward;
      } catch (error: unknown) {
        logger.error("Error creating reward:", getErrorMessage(error));
        throw new Error(getErrorMessage(error));
      }
    },
    entityName: 'Reward',
    createOptimisticItem: (variables, optimisticId) => {
      const now = new Date().toISOString();
      return {
        id: optimisticId,
        ...variables, 
        created_at: now,
        updated_at: now,
        description: variables.description === undefined ? null : variables.description,
        background_image_url: variables.background_image_url === undefined ? null : variables.background_image_url,
        icon_name: variables.icon_name === undefined ? null : variables.icon_name,
        icon_url: variables.icon_url === undefined ? null : variables.icon_url,
      } as Reward;
    },
  });
};
