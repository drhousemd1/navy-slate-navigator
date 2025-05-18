
import { useQueryClient } from '@tanstack/react-query';
import { useCreateOptimisticMutation, useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
import { saveReward as saveRewardToServer } from '@/lib/rewardUtils';
import { Reward, CreateRewardVariables, UpdateRewardVariables, RewardWithId } from '../types'; // Corrected import path
// import { v4 as uuidv4 } from 'uuid'; // uuidv4 is used by optimistic hooks, not directly here.
import { toast } from '@/hooks/use-toast';

export const useCreateRewardMutation = () => {
  const queryClient = useQueryClient();
  return useCreateOptimisticMutation<RewardWithId, Error, CreateRewardVariables>({
    queryClient,
    queryKey: ['rewards'],
    mutationFn: async (variables) => {
      const result = await saveRewardToServer(variables); 
      if (!result) throw new Error('Reward creation failed');
      return result as RewardWithId;
    },
    entityName: 'Reward',
    createOptimisticItem: (variables, optimisticId) => {
      const now = new Date().toISOString();
      return {
        id: optimisticId,
        created_at: now,
        updated_at: now,
        ...variables, 
        title: variables.title,
        cost: variables.cost,
        supply: variables.supply,
        is_dom_reward: variables.is_dom_reward,
        description: variables.description || null,
        icon_name: variables.icon_name || 'Award',
        icon_color: variables.icon_color || '#9b87f5',
        title_color: variables.title_color || '#FFFFFF',
        subtext_color: variables.subtext_color || '#8E9196',
        calendar_color: variables.calendar_color || '#7E69AB',
        background_image_url: variables.background_image_url || null,
        background_opacity: variables.background_opacity === undefined ? 100 : variables.background_opacity,
        highlight_effect: variables.highlight_effect === undefined ? false : variables.highlight_effect,
        focal_point_x: variables.focal_point_x === undefined ? 50 : variables.focal_point_x,
        focal_point_y: variables.focal_point_y === undefined ? 50 : variables.focal_point_y,
        icon_url: variables.icon_url || null,
      };
    },
  });
};

export const useUpdateRewardMutation = () => {
  const queryClient = useQueryClient();
  return useUpdateOptimisticMutation<RewardWithId, Error, UpdateRewardVariables>({
    queryClient,
    queryKey: ['rewards'],
    mutationFn: async (variables) => {
      const { id, ...updateData } = variables;
      const result = await saveRewardToServer(updateData, id);
      if (!result) throw new Error('Reward update failed');
      return result as RewardWithId;
    },
    entityName: 'Reward',
  });
};
