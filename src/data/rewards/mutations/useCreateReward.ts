
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
import { Reward, CreateRewardVariables } from '@/data/rewards/types';
import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager';

export const useCreateReward = () => {
  const queryClient = useQueryClient();

  return useCreateOptimisticMutation<Reward, Error, CreateRewardVariables>({
    queryClient,
    queryKey: [...CRITICAL_QUERY_KEYS.REWARDS], // Corrected: spread to create mutable array
    mutationFn: async (variables: CreateRewardVariables) => {
      const { data, error } = await supabase
        .from('rewards')
        .insert({ ...variables }) // Assuming user_id is handled by RLS or passed in variables
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Reward creation failed, no data returned.');
      return data as Reward;
    },
    entityName: 'Reward',
    // createOptimisticItem can be further customized if needed
    createOptimisticItem: (variables, optimisticId) => {
      // Basic optimistic item, ensure all required Reward fields are present or defaulted
      const now = new Date().toISOString();
      return {
        id: optimisticId,
        ...variables,
        user_id: variables.user_id || '', // Placeholder, should be set if not in variables
        created_at: now,
        updated_at: now,
        // ensure other non-optional fields from Reward interface have defaults here
        // if not covered by CreateRewardVariables and not nullable
        cost: variables.cost || 0,
        dom_cost: variables.dom_cost || 0,
        is_sub_only: variables.is_sub_only || false,
        is_dom_only: variables.is_dom_only || false,
        max_quantity: variables.max_quantity ?? null,
        current_quantity: variables.current_quantity ?? variables.max_quantity ?? null,
        requires_confirmation: variables.requires_confirmation || false,
        background_opacity: variables.background_opacity ?? 100,
        title_color: variables.title_color || '#FFFFFF',
        subtext_color: variables.subtext_color || '#DDDDDD',
        icon_color: variables.icon_color || '#FFFFFF',
        highlight_effect: variables.highlight_effect || false,
        focal_point_x: variables.focal_point_x ?? 50,
        focal_point_y: variables.focal_point_y ?? 50,
      } as Reward;
    },
  });
};
