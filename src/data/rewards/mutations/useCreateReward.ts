
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
import { Reward, CreateRewardVariables } from '@/data/rewards/types';
import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager'; // Assuming this defines REWARDS

export const useCreateReward = () => {
  const queryClient = useQueryClient();

  return useCreateOptimisticMutation<Reward, Error, CreateRewardVariables>({
    queryClient,
    queryKey: CRITICAL_QUERY_KEYS.REWARDS,
    mutationFn: async (variables: CreateRewardVariables) => {
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
      // Based on DB defaults and Reward type
      return {
        id: optimisticId,
        created_at: now,
        updated_at: now,
        title: variables.title,
        description: variables.description || null,
        cost: variables.cost || 10, // Default from DB
        supply: variables.supply || 0, // Default from DB
        is_dom_reward: variables.is_dom_reward || false, // Default from DB
        icon_name: variables.icon_name || null,
        background_image_url: variables.background_image_url || null,
        title_color: variables.title_color || '#FFFFFF',
        subtext_color: variables.subtext_color || '#8E9196',
        calendar_color: variables.calendar_color || '#7E69AB',
        icon_color: variables.icon_color || '#9b87f5',
        background_opacity: variables.background_opacity || 100,
        highlight_effect: variables.highlight_effect || false,
        focal_point_x: variables.focal_point_x || 50,
        focal_point_y: variables.focal_point_y || 50,
        // Spread other potential variables, though CreateRewardVariables is specific
        ...variables, 
      } as Reward;
    },
  });
};
