
import { useQueryClient } from '@tanstack/react-query';
import { useCreateOptimisticMutation, useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
import { saveReward as saveRewardToServer } from '@/lib/rewardUtils';
import { Reward, CreateRewardVariables, UpdateRewardVariables, RewardWithId } from '../types'; // Corrected import path
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast'; // Added toast import

// The old combined useSaveReward hook that caused errors is removed.
// Only useCreateRewardMutation and useUpdateRewardMutation remain.

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
        // Spread all properties from CreateRewardVariables
        ...variables,
        // Provide defaults for fields in Reward that are not in CreateRewardVariables if necessary,
        // but CreateRewardVariables should cover what's needed for the server.
        // Ensure all required fields of Reward are covered.
        // The example from CreateRewardVariables seems fine.
        // Default visual properties (if not in variables which they should be if using Partial correctly in types.ts)
        description: variables.description || null,
        icon_name: variables.icon_name || 'Award',
        icon_color: variables.icon_color || '#9b87f5',
        title_color: variables.title_color || '#FFFFFF',
        subtext_color: variables.subtext_color || '#8E9196',
        calendar_color: variables.calendar_color || '#7E69AB',
        background_image_url: variables.background_image_url || null,
        background_opacity: variables.background_opacity || 100,
        highlight_effect: variables.highlight_effect || false,
        focal_point_x: variables.focal_point_x || 50,
        focal_point_y: variables.focal_point_y || 50,
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
      // Pass updateData directly, saveRewardToServer expects Omit<UpdateRewardVariables, 'id'>
      const result = await saveRewardToServer(updateData, id);
      if (!result) throw new Error('Reward update failed');
      return result as RewardWithId;
    },
    entityName: 'Reward',
  });
};
