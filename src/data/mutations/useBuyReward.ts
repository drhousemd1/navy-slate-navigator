import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/data/rewards/types';
import { useRewardOperations } from '@/contexts/rewards/useRewardOperations'; // Assuming this is the correct path
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';

export const REWARDS_QUERY_KEY = ['rewards']; // Define if not already globally available

export function useBuyReward() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { recordRewardUsage, invalidateUserPoints } = useRewardOperations();
  const { toast } = useToast();

  return useMutation<Reward, Error, Reward, { previousRewards: Reward[] | undefined }>({
    onMutate: async (boughtReward: Reward) => {
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);
      
      // Optimistically update: This might be complex if supply needs to be tracked.
      // For simplicity, if supply is handled server-side or not part of this optimistic update:
      // queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldData) => 
      //   oldData ? oldData.map(r => r.id === boughtReward.id ? { ...r, /* update if needed */ } : r) : []
      // );
      
      return { previousRewards };
    },
    mutationFn: async (reward: Reward) => {
      if (!user) throw new Error('User not authenticated');

      const pointsToDeduct = reward.cost;
      const currentPointsKey = reward.is_dom_reward ? 'dom_points' : 'points';

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(currentPointsKey)
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profileData) throw new Error('User profile not found.');
      
      const currentPointsValue = (profileData[currentPointsKey] as number) || 0;

      if (currentPointsValue < pointsToDeduct) {
        throw new Error(`Not enough ${reward.is_dom_reward ? 'DOM' : ''} points.`);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [currentPointsKey]: currentPointsValue - pointsToDeduct })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await recordRewardUsage(reward.id, user.id, reward.cost, reward.is_dom_reward);
      
      return reward; 
    },
    onSuccess: (data, variables, context) => {
      invalidateUserPoints(); // Invalidate points which includes DOM points
      // No need to manually update REWARDS_QUERY_KEY if it's just a purchase,
      // unless the reward item itself changes (e.g., supply limited).
      // If rewards list needs refresh (e.g. to show updated supply if tracked on reward item):
      // queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });

      toast({ title: 'Reward Purchased!', description: `${data.title} has been successfully purchased.` });
      logger.info(`Reward ${data.id} purchased by user ${user?.id}`);
    },
    onError: (error, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards);
      }
      toast({
        title: 'Purchase Failed',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      logger.error('Error buying reward:', getErrorMessage(error));
    },
    onSettled: () => {
      // queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY }); // Already handled or not needed for this specific mutation
      // User points are invalidated in onSuccess
    },
  });
}
