
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSyncManager, CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager';
import { Reward } from '@/data/rewards/types';

interface BuyDomRewardArgs {
  rewardId: string;
  cost: number;
  currentSupply: number; // This is likely the reward's total supply, not user's
  profileId: string;
  currentDomPoints: number;
}

interface BuyDomRewardOptimisticContext {
  previousRewards?: Reward[];
  previousDomPoints?: number;
}

export const useBuyDomReward = () => {
  const queryClient = useQueryClient();
  const { syncKeys } = useSyncManager();

  return useMutation<Reward, Error, BuyDomRewardArgs, BuyDomRewardOptimisticContext>({
      mutationFn: async ({ rewardId, cost, currentSupply, profileId, currentDomPoints }) => {
        // The original logic implies "buying" decrements the reward's available stock.
        // And "redeeming" or "using" would decrement a user's owned stock (if that's tracked separately).
        // Current 'supply' on Reward table seems to be total available stock.
        // If buying means user gets one, and reward stock decreases:
        if (currentSupply <= 0) { // This refers to the reward's supply in the DB
          throw new Error("Reward is out of stock.");
        }
        if (currentDomPoints < cost) {
          throw new Error("Not enough Dom points.");
        }

        const newSupply = currentSupply - 1; // Decrement reward's total supply
        const newDomPoints = currentDomPoints - cost;

        // Update reward supply
        const { error: supplyError } = await supabase
          .from('rewards')
          .update({ supply: newSupply })
          .eq('id', rewardId);

        if (supplyError) throw supplyError;

        // Update user's Dom points
        const { error: pointsError } = await supabase
          .from('profiles')
          .update({ dom_points: newDomPoints })
          .eq('id', profileId);

        if (pointsError) {
          // Attempt to revert supply update
          await supabase.from('rewards').update({ supply: currentSupply }).eq('id', rewardId);
          throw pointsError;
        }
        
        const { data: updatedReward, error: fetchError } = await supabase
          .from('rewards')
          .select('*')
          .eq('id', rewardId)
          .single();

        if (fetchError) throw fetchError;
        if (!updatedReward) throw new Error('Failed to fetch updated reward after purchase.');
        
        return updatedReward as Reward;
      },
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS });
        await queryClient.cancelQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS });

        const previousRewards = queryClient.getQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS);
        const previousDomPoints = queryClient.getQueryData<number>(CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS);

        queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, (old = []) =>
          old.map(reward =>
            reward.id === variables.rewardId
              // This should reflect what happens on BUY. If supply means total stock, it decreases.
              // If user gets an "instance", their "owned supply" for this reward would increase.
              // Based on error "Reward is out of stock", supply is total stock.
              ? { ...reward, supply: reward.supply - 1 } 
              : reward
          )
        );

        queryClient.setQueryData<number>(CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS, (oldPoints = 0) =>
          (oldPoints || 0) - variables.cost // Ensure oldPoints is not undefined
        );
        
        return { previousRewards, previousDomPoints };
      },
      onError: (err, variables, context) => {
        if (context?.previousRewards) {
          queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, context.previousRewards);
        }
        if (context?.previousDomPoints !== undefined) {
          queryClient.setQueryData<number>(CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS, context.previousDomPoints);
        }
        toast({ title: "Purchase Failed", description: err.message, variant: "destructive" });
      },
      onSuccess: (data, variables) => {
        queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, (oldRewards = []) => {
          return oldRewards.map(r => r.id === data.id ? data : r);
        });
        queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS });
        
        toast({ title: "Reward Purchased!", description: `You bought ${data.title}.` }); // Use data.title
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS });
        queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS });
      },
    }
  );
};
