
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
import { Reward, UpdateRewardVariables } from '@/data/rewards/types';
import { processImageForSave } from '@/utils/image/rewardIntegration';

const REWARDS_QUERY_KEY = ['rewards'];

export const useUpdateReward = () => {
  const queryClient = useQueryClient();

  return useUpdateOptimisticMutation<Reward, Error, UpdateRewardVariables>({
    queryClient,
    queryKey: REWARDS_QUERY_KEY,
    mutationFn: async (variables: UpdateRewardVariables) => {
      const { id, ...updatesFromVariables } = variables;

      // Process image if present
      const { processedUrl, metadata } = await processImageForSave(updatesFromVariables.background_image_url || null);

      const updates = {
        ...updatesFromVariables,
        background_image_url: processedUrl,
        image_meta: updatesFromVariables.image_meta || metadata,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('rewards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      if (!data) throw new Error('Reward update failed, no data returned.');
      return data as Reward;
    },
    entityName: 'Reward',
    idField: 'id',
  });
};
