
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
import { Reward, CreateRewardVariables } from '@/data/rewards/types';
import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager';

export const useCreateReward = () => {
  const queryClient = useQueryClient();

  return useCreateOptimisticMutation<Reward, Error, CreateRewardVariables>({
    queryClient,
    queryKey: [...CRITICAL_QUERY_KEYS.REWARDS],
    mutationFn: async (variables: CreateRewardVariables) => {
      // user_id is typically handled by RLS policies based on the authenticated user,
      // or would be part of CreateRewardVariables if it needs to be explicitly set.
      // The current Reward type and Supabase schema for 'rewards' do not include user_id directly.
      const { data, error } = await supabase
        .from('rewards')
        .insert({ ...variables }) 
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Reward creation failed, no data returned.');
      return data as Reward;
    },
    entityName: 'Reward',
    createOptimisticItem: (variables, optimisticId) => {
      const now = new Date().toISOString();
      // CreateRewardVariables contains all necessary fields for a new Reward,
      // except for id, created_at, and updated_at, which are handled here.
      return {
        id: optimisticId,
        ...variables, // Spread all properties from CreateRewardVariables
        created_at: now,
        updated_at: now,
        // Ensure any fields that are optional in CreateRewardVariables but part of Reward
        // (and might need specific null/default if not provided) are correctly set.
        // In this case, CreateRewardVariables aligns well with Reward field requirements.
        // For example, if variables.description could be undefined but Reward needs null:
        description: variables.description === undefined ? null : variables.description,
        background_image_url: variables.background_image_url === undefined ? null : variables.background_image_url,
        icon_name: variables.icon_name === undefined ? null : variables.icon_name,
        icon_url: variables.icon_url === undefined ? null : variables.icon_url,
      } as Reward;
    },
  });
};
