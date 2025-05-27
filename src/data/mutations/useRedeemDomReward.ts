
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/data/rewards/types';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

interface RedeemDomRewardArgs {
  rewardId: string;
  currentSupply: number; 
  profileId: string;
}

interface RedeemDomRewardOptimisticContext {
  previousRewards?: Reward[];
}

export const useRedeemDomReward = () => {
  const queryClient = useQueryClient();

  return useMutation<Reward, Error, RedeemDomRewardArgs, RedeemDomRewardOptimisticContext>({
    mutationFn: async ({ rewardId, currentSupply }) => {
      try {
        // Redeeming implies the user *has* this reward and is now using it.
        // This usually means decrementing the user's count of this reward.
        // The current 'supply' in Reward table is total stock.
        // If 'currentSupply' passed here is the reward's total stock:
        if (currentSupply <= 0) {
          // This message sounds like user's stock: "Reward is out of stock, cannot use."
          // If it's general reward stock:
          throw new Error("Reward is out of stock, cannot use.");
        }
        const newSupply = currentSupply - 1; // Total reward stock decreases

        const { error: supplyError } = await supabase
          .from('rewards')
          .update({ supply: newSupply })
          .eq('id', rewardId);

        if (supplyError) throw supplyError;
        
        // TODO: Potentially log usage in reward_usage table if that's part of redeeming.
        // The other useRedeemDomReward in rewards/mutations does this.

        const { data: updatedReward, error: fetchError } = await supabase
          .from('rewards')
          .select('*')
          .eq('id', rewardId)
          .single();

        if (fetchError) throw fetchError;
        if (!updatedReward) throw new Error('Failed to fetch updated reward after redeeming.');
        
        return updatedReward as Reward;
      } catch (error: unknown) {
        logger.error("Error redeeming DOM reward:", getErrorMessage(error));
        throw new Error(getErrorMessage(error));
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['rewards'] });
      const previousRewards = queryClient.getQueryData<Reward[]>(['rewards']);

      queryClient.setQueryData<Reward[]>(['rewards'], (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply - 1 } 
            : reward
        )
      );
      return { previousRewards };
    },
    onError: (err, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(['rewards'], context.previousRewards);
      }
      toast({ title: "Failed to Use Reward", description: err.message, variant: "destructive" });
    },
    onSuccess: (data, variables) => {
       queryClient.setQueryData<Reward[]>(['rewards'], (oldRewards = []) => {
        return oldRewards.map(r => r.id === data.id ? data : r);
      });
      toast({ title: "Reward Used!", description: `You used ${data.title}.` });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    },
  });
};
