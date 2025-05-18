
```typescript
import { useQueryClient } from '@tanstack/react-query';
import { useCreateOptimisticMutation, useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
import { saveReward as saveRewardToServer } from '@/lib/rewardUtils';
import { Reward, CreateRewardVariables, UpdateRewardVariables, RewardWithId } from '../types'; // Corrected import path
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast'; // Added toast import
// Removed: import { useMutation } from '@tanstack/react-query'; as it's not directly used here, optimistic hooks wrap it.


export const useCreateRewardMutation = () => {
  const queryClient = useQueryClient();
  return useCreateOptimisticMutation<RewardWithId, Error, CreateRewardVariables>({
    queryClient,
    queryKey: ['rewards'],
    mutationFn: async (variables) => {
      // variables is CreateRewardVariables, which already has title as required.
      const result = await saveRewardToServer(variables); 
      if (!result) throw new Error('Reward creation failed');
      return result as RewardWithId;
    },
    entityName: 'Reward',
    createOptimisticItem: (variables, optimisticId) => { // variables is CreateRewardVariables
      const now = new Date().toISOString();
      // The returned object must be RewardWithId
      // `variables` already contains required fields like title, cost, supply, is_dom_reward
      return {
        id: optimisticId,
        created_at: now,
        updated_at: now,
        // Spread all properties from CreateRewardVariables
        ...variables, 
        // Ensure all fields of Reward are covered, providing defaults for those not in CreateRewardVariables
        // if `variables` is a true Partial<Reward> plus required ones.
        // CreateRewardVariables is Partial<Omit<Reward, 'id' | 'created_at' | 'updated_at'>> & { title: string; ... }
        // So, non-required fields from Reward might be missing in `variables` if not provided at call site.
        // The defaults below ensure the returned object satisfies RewardWithId.
        title: variables.title, // Already required in CreateRewardVariables
        cost: variables.cost, // Already required
        supply: variables.supply, // Already required
        is_dom_reward: variables.is_dom_reward, // Already required
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
    // onSuccess and onError are handled by useCreateOptimisticMutation internally (shows toast)
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
    // onSuccess and onError are handled by useUpdateOptimisticMutation internally
  });
};
```
