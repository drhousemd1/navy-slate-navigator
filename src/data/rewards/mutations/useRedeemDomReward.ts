
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Reward } from '../types'; 

const REWARDS_QUERY_KEY = ['rewards'];

interface RedeemDomRewardVariables {
  rewardId: string;
  currentSupply: number;
  profileId: string;
}

interface RedeemDomRewardOptimisticContext {
  previousRewards?: Reward[];
}

export const useRedeemDomReward = () => {
  const queryClient = useQueryClient();

  return useMutation<Reward, Error, RedeemDomRewardVariables, RedeemDomRewardOptimisticContext>({
    mutationFn: async ({ rewardId, currentSupply }) => {
      // Only consider out of stock if supply is exactly 0 (unlimited is -1)
      if (currentSupply === 0) {
        toast({ // Toast before throwing
          title: "Out of stock",
          description: "This DOM reward is out of stock and cannot be used.",
          variant: "destructive",
        });
        throw new Error("Reward is out of stock, cannot use.");
      }
      // newSupply should not decrement if currentSupply is -1 (unlimited)
      const newSupply = currentSupply === -1 ? currentSupply : currentSupply - 1;

      const { error: supplyError } = await supabase
        .from('rewards')
        .update({ supply: newSupply, updated_at: new Date().toISOString() }) // Added updated_at
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
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);

      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply === -1 ? -1 : reward.supply - 1 } // Handle unlimited supply
            : reward
        )
      );
      return { previousRewards };
    },
    onError: (err, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards);
      }
      // Avoid redundant toasts for known, pre-toasted errors
      if (err.message !== "Reward is out of stock, cannot use.") {
        toast({ 
          title: "Failed to Use DOM Reward", 
          description: err.message || "An unexpected error occurred.", 
          variant: "destructive" 
        });
      }
    },
    onSuccess: (data, variables) => {
      // queryClient.setQueryData already handled optimistically and by invalidation.
      queryClient.invalidateQueries({ queryKey: [REWARDS_QUERY_KEY, variables.rewardId] });
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      toast({ title: "DOM Reward Used!", description: `You used ${data.title}.` });
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: [REWARDS_QUERY_KEY, variables.rewardId] });
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
    },
  });
};
