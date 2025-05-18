
```typescript
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward, UpdateRewardVariables } from '../types'; // Corrected path
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';


export const useUpdateReward = () => {
  const queryClient = useQueryClient();

  return useUpdateOptimisticMutation<Reward, Error, UpdateRewardVariables>({
    queryClient,
    queryKey: ['rewards'],
    mutationFn: async (variables: UpdateRewardVariables) => {
      const { id, ...updates } = variables;
      
      const { data, error } = await supabase
        .from('rewards')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Reward update failed.');
      
      return data as Reward;
    },
    entityName: 'Reward',
    idField: 'id', 
  });
};
```
