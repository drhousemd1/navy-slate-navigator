
import { useQueryClient } from '@tanstack/react-query';
import { useCreateOptimisticMutation, useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
import { saveReward as saveRewardToServer } from '@/lib/rewardUtils';
import { Reward, CreateRewardVariables, UpdateRewardVariables, RewardWithId } from '@/data/rewards/types';
import { v4 as uuidv4 } from 'uuid';

// This hook combines create and update logic.
// You might call useSaveReward().createMutateAsync or useSaveReward().updateMutateAsync
// Or, provide a single mutateAsync that decides based on presence of `id` in variables.
// For simplicity, this example provides one mutate function that handles both.

export const useSaveReward = () => {
  const queryClient = useQueryClient();

  // Using a single mutation hook for simplicity, differentiating by `id` in variables.
  // This is a common pattern but requires careful typing for `mutationFn`.
  // Alternatively, export two separate hooks: useCreateReward and useUpdateReward.

  return useMutation<Reward, Error, Partial<Reward> & { id?: string, title: string, cost: number, supply: number, is_dom_reward: boolean }>({ // A bit broad to cover both
    mutationFn: async (variables) => {
      const { id, ...rewardData } = variables;
      const result = await saveRewardToServer(
        rewardData as (Partial<Omit<Reward, 'id'>> & { title: string, cost: number, supply: number, is_dom_reward: boolean }), // Cast for create
        id // Pass id for update
      );
      if (!result) {
        throw new Error(id ? 'Failed to update reward' : 'Failed to create reward');
      }
      return result;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['rewards'] });
      const previousRewards = queryClient.getQueryData<Reward[]>(['rewards']);

      if (variables.id) { // Optimistic Update
        queryClient.setQueryData<Reward[]>(['rewards'], (old = []) =>
          old.map(reward =>
            reward.id === variables.id ? { ...reward, ...variables, updated_at: new Date().toISOString() } as Reward : reward
          )
        );
      } else { // Optimistic Create
        const optimisticId = uuidv4();
        const optimisticReward: Reward = {
          id: optimisticId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          title: variables.title,
          description: variables.description || null,
          cost: variables.cost,
          supply: variables.supply,
          is_dom_reward: variables.is_dom_reward,
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
          ...variables, // Spread other potential fields from Partial<Reward>
        };
        queryClient.setQueryData<Reward[]>(['rewards'], (old = []) => [optimisticReward, ...old]);
        // Store optimisticId in context for potential replacement on success
        return { previousRewards, optimisticId }; 
      }
      return { previousRewards };
    },
    onError: (err, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(['rewards'], context.previousRewards);
      }
      toast({ title: `Error saving reward`, description: err.message, variant: 'destructive' });
    },
    onSuccess: (data, variables, context) => { // data is the actual item from server
      queryClient.setQueryData<Reward[]>(['rewards'], (old = []) => {
        if (variables.id) { // Update
          return old.map(item => (item.id === data.id ? data : item));
        } else { // Create - replace optimistic with server confirmed
           const optimisticId = (context as any)?.optimisticId;
           if (optimisticId) {
             const filteredList = old.filter(item => item.id !== optimisticId);
             return [data, ...filteredList];
           }
           return [data, ...old.filter(item => item.id !== data.id)]; // Fallback if no optimisticId
        }
      });
      toast({ title: `Reward ${variables.id ? 'updated' : 'created'} successfully!` });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    },
  });
};

// Consider splitting into useCreateReward and useUpdateReward for clearer types and logic
// using useCreateOptimisticMutation and useUpdateOptimisticMutation from '@/lib/optimistic-mutations.ts'
// For now, the combined hook above demonstrates the principle.
// Let's refine this using the provided optimistic mutation hooks.

// Placeholder for a more refined version if the above is too complex:
// This simplified version does not use the generic optimistic hooks yet.
// It's a standard useMutation setup.
// The generic optimistic hooks are more robust.
// For the sake of progress, I'll use a simpler structure now and can refine with generic hooks later.
// The prompt implies using useCreateOptimisticMutation etc. I will use them.

export const useCreateRewardMutation = () => {
  const queryClient = useQueryClient();
  return useCreateOptimisticMutation<RewardWithId, Error, CreateRewardVariables>({
    queryClient,
    queryKey: ['rewards'],
    mutationFn: async (variables) => {
      const result = await saveRewardToServer(variables); // existingId is undefined for create
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
        title: variables.title,
        description: variables.description || null,
        cost: variables.cost,
        supply: variables.supply,
        is_dom_reward: variables.is_dom_reward,
        // Default visual properties
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
      const result = await saveRewardToServer(updateData, id);
      if (!result) throw new Error('Reward update failed');
      return result as RewardWithId;
    },
    entityName: 'Reward',
  });
};

