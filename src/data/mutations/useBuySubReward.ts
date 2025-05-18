
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSyncManager, CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager'; // Corrected import path
import { Reward } from '@/data/rewards/types'; // Corrected import path

interface BuySubRewardArgs {
  rewardId: string;
  cost: number;
  currentSupply: number; // Reward's total supply
  profileId: string;
  currentPoints: number;
}

interface BuySubRewardOptimisticContext {
  previousRewards?: Reward[];
  previousPoints?: number;
}

export const useBuySubReward = () => {
  const queryClient = useQueryClient();
  const { syncKeys } = useSyncManager();

  return useMutation<Reward, Error, BuySubRewardArgs, BuySubRewardOptimisticContext>({ // Added context
    mutationFn: async ({ rewardId, cost, currentSupply, profileId, currentPoints }) => {
      if (currentSupply <= 0) {
        throw new Error("Reward is out of stock.");
      }
      if (currentPoints < cost) {
        throw new Error("Not enough points.");
      }

      const newSupply = currentSupply - 1; // Reward's supply decreases
      const newPoints = currentPoints - cost;

      const { error: supplyError } = await supabase
        .from('rewards')
        .update({ supply: newSupply })
        .eq('id', rewardId);

      if (supplyError) throw supplyError;

      const { error: pointsError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', profileId);

      if (pointsError) {
        await supabase.from('rewards').update({ supply: currentSupply }).eq('id', rewardId); // Revert
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
      await queryClient.cancelQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_POINTS });

      const previousRewards = queryClient.getQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS);
      const previousPoints = queryClient.getQueryData<number>(CRITICAL_QUERY_KEYS.REWARDS_POINTS);
      
      queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply - 1 } // Reward stock decreases
            : reward
        )
      );
      queryClient.setQueryData<number>(CRITICAL_QUERY_KEYS.REWARDS_POINTS, (oldPoints = 0) =>
        (oldPoints || 0) - variables.cost
      );

      return { previousRewards, previousPoints };
    },
    onError: (err, variables, context) => { // context is typed
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, context.previousRewards);
      }
      if (context?.previousPoints !== undefined) {
        queryClient.setQueryData<number>(CRITICAL_QUERY_KEYS.REWARDS_POINTS, context.previousPoints);
      }
      toast({ title: "Purchase Failed", description: err.message, variant: "destructive" });
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, (oldRewards = []) => {
        return oldRewards.map(r => r.id === data.id ? data : r);
      });
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_POINTS });
      toast({ title: "Reward Purchased!", description: `You bought ${data.title}.` });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS });
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_POINTS });
    },
  });
};
```
