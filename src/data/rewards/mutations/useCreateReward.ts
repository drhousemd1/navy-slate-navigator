
```typescript
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward, CreateRewardVariables as ActualCreateRewardVariables } from '../types'; // Using the centralized types
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';

// This type might be slightly different from the one in ../types if it was intended to be simpler.
// For consistency, we should aim to use ActualCreateRewardVariables from ../types.
// export type CreateRewardVariables = Omit<Reward, 'id' | 'created_at' | 'updated_at'>;
// Using the more specific type from ../types
export type CreateRewardVariables = ActualCreateRewardVariables;


export const useCreateReward = () => {
  const queryClient = useQueryClient();

  return useCreateOptimisticMutation<Reward, Error, CreateRewardVariables>({
    queryClient,
    queryKey: ['rewards'],
    mutationFn: async (variables: CreateRewardVariables) => {
      // `variables` should conform to the columns of the 'rewards' table,
      // excluding 'id', 'created_at', 'updated_at' which are auto-generated or set.
      // CreateRewardVariables from ../types is:
      // Partial<Omit<Reward, 'id' | 'created_at' | 'updated_at'>> & { title: string; cost: number; supply: number; is_dom_reward: boolean; };
      // This is suitable for an insert.
      const { data, error } = await supabase
        .from('rewards')
        .insert(variables) // Changed from .insert({ ...variables })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Reward creation failed.');
      
      return data as Reward; // Supabase returns the full Reward object matching the table
    },
    entityName: 'Reward',
    createOptimisticItem: (variables, optimisticId) => { // variables is CreateRewardVariables
      const now = new Date().toISOString();
      // This must return a Reward object (or RewardWithId which is compatible)
      return {
        id: optimisticId,
        created_at: now,
        updated_at: now,
        // Spread variables, then provide defaults for any Reward fields not in CreateRewardVariables
        ...variables, 
        // Ensure all fields of Reward are covered.
        // Defaults for fields that might be optional in CreateRewardVariables' Partial part:
        description: variables.description || null,
        background_image_url: variables.background_image_url || null,
        background_opacity: variables.background_opacity === undefined ? 100 : variables.background_opacity,
        icon_name: variables.icon_name || 'Award', // Default icon
        icon_url: variables.icon_url || null,
        icon_color: variables.icon_color || '#9b87f5', // Default color
        title_color: variables.title_color || '#FFFFFF',
        subtext_color: variables.subtext_color || '#8E9196',
        calendar_color: variables.calendar_color || '#7E69AB',
        highlight_effect: variables.highlight_effect === undefined ? false : variables.highlight_effect,
        focal_point_x: variables.focal_point_x === undefined ? 50 : variables.focal_point_x,
        focal_point_y: variables.focal_point_y === undefined ? 50 : variables.focal_point_y,
        // title, cost, supply, is_dom_reward are required in CreateRewardVariables from ../types
      } as Reward; // Cast to Reward, matching TData
    },
  });
};
```
