import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward, CreateRewardVariables, RawSupabaseReward } from '@/data/rewards/types';
import { parseRewardData } from '../queries'; // Assuming parseRewardData exists
import { REWARDS_QUERY_KEY } from './useBuyReward'; // or common place
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { toast } from '@/hooks/use-toast';

export function useCreateReward() {
  const queryClient = useQueryClient();

  return useMutation<Reward, Error, CreateRewardVariables, { previousRewards: Reward[] | undefined }>({
    onMutate: async (newRewardData) => {
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);
      
      const optimisticReward: Reward = {
        // ... create a temporary optimistic reward structure
        id: `optimistic-${Date.now()}`, // Temporary ID
        ...newRewardData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Ensure all fields of Reward are present
        user_id: newRewardData.user_id || undefined,
        description: newRewardData.description || null,
        icon_name: newRewardData.icon_name || null,
        icon_url: newRewardData.icon_url || null,
        background_image_url: newRewardData.background_image_url || null,
        background_images: newRewardData.background_images || null,
        is_dom_reward: newRewardData.is_dom_reward || false,
      };

      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldData) => 
        oldData ? [optimisticReward, ...oldData] : [optimisticReward]
      );
      return { previousRewards };
    },
    mutationFn: async (rewardData: CreateRewardVariables) => {
      const { data, error } = await supabase
        .from('rewards')
        .insert(rewardData as any) // Cast if Supabase types are too strict for partial insert
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Failed to create reward, no data returned.');
      return parseRewardData(data as RawSupabaseReward);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY }); // Invalidate to get the real data
      toast({ title: 'Reward Created', description: `${data.title} has been created.` });
    },
    onError: (error, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards);
      }
      toast({ title: 'Creation Failed', description: getErrorMessage(error), variant: 'destructive' });
      logger.error('Error creating reward:', getErrorMessage(error));
    },
    // onSettled: () => { // Not always needed if onSuccess handles invalidation
    //   queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
    // }
  });
}
