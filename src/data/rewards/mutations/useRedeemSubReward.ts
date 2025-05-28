
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Reward } from '../types';

const REWARDS_QUERY_KEY = ['rewards']; // Standardized query key

interface RedeemSubRewardVariables {
  rewardId: string;
  currentSupply: number;
  profileId: string; 
}

interface RedeemSubRewardOptimisticContext {
  previousRewards?: Reward[];
}

export const useRedeemSubReward = () => {
  const queryClient = useQueryClient();

  return useMutation<Reward, Error, RedeemSubRewardVariables, RedeemSubRewardOptimisticContext>({
    mutationFn: async ({ rewardId, currentSupply }) => {
      if (currentSupply <= 0 && currentSupply !== -1) { // Allow -1 for infinite supply
        throw new Error("Reward is out of stock, cannot use.");
      }
      // For infinite supply (-1), supply remains -1. Otherwise, decrement.
      const newSupply = currentSupply === -1 ? -1 : currentSupply - 1;

      const { error: supplyError } = await supabase
        .from('rewards')
        .update({ supply: newSupply, updated_at: new Date().toISOString() })
        .eq('id', rewardId);

      if (supplyError) throw supplyError;

      const { data: updatedReward, error: fetchError } = await supabase
        .from('rewards')
        .select('*')
        .eq('id', rewardId)
        .single();

      if (fetchError) throw fetchError;
      if (!updatedReward) throw new Error('Failed to fetch updated reward after redeeming.');
      
      return updatedReward as Reward;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY }); // Use standardized key
      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY); // Use standardized key

      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) => // Use standardized key
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply === -1 ? -1 : reward.supply - 1 }
            : reward
        )
      );
      return { previousRewards };
    },
    onError: (err, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards); // Use standardized key
      }
      toast({ 
        title: "Failed to Use Reward", 
        description: err.message, 
        variant: "destructive" 
      });
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldRewards = []) => { // Use standardized key
        return oldRewards.map(r => r.id === data.id ? data : r);
      });
      toast({ title: "Reward Used!", description: `You used ${data.title}.` });
    },
    onSettled: (_data, _error, variables) => { 
      // Invalidating the entire list is usually sufficient and simpler.
      // If specific item invalidation is ever critical, can use:
      // queryClient.invalidateQueries({ queryKey: [...REWARDS_QUERY_KEY, variables.rewardId] });
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY }); // Use standardized key and simplify
    },
  });
};
