import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSyncManager, CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager'; // Corrected import path
import { Reward } from '@/data/rewards/types';

interface BuyDomRewardArgs {
  rewardId: string;
  cost: number;
  currentSupply: number;
  profileId: string;
  currentDomPoints: number;
}

export const useBuyDomReward = () => {
  const queryClient = useQueryClient();
  const { syncKeys } = useSyncManager();

  return useMutation<Reward, Error, BuyDomRewardArgs>({
    mutationFn: async ({ rewardId, cost, currentSupply, profileId, currentDomPoints }) => {
      if (currentSupply <= 0) {
        throw new Error("Reward is out of stock.");
      }
      if (currentDomPoints < cost) {
        throw new Error("Not enough Dom points.");
      }

      const newSupply = currentSupply - 1;
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
      
      // Fetch the updated reward to return it
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
      await queryClient.cancelQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS }); // Use key from useSyncManager

      const previousRewards = queryClient.getQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS);
      const previousDomPoints = queryClient.getQueryData<number>(CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS);

      // Optimistically update rewards
      queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply - 1 }
            : reward
        )
      );

      // Optimistically update Dom points
      queryClient.setQueryData<number>(CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS, (oldPoints = 0) =>
        oldPoints - variables.cost
      );
      
      return { previousRewards, previousDomPoints };
    },
    onError: (err, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, context.previousRewards);
      }
      if (context?.previousDomPoints !== undefined) { // Check for undefined specifically for points
        queryClient.setQueryData<number>(CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS, context.previousDomPoints);
      }
      toast({ title: "Purchase Failed", description: err.message, variant: "destructive" });
    },
    onSuccess: (data, variables) => {
      // Data is the updated reward from the server
      queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, (oldRewards = []) => {
        return oldRewards.map(r => r.id === data.id ? data : r);
      });
      // Dom points are already updated on server, just invalidate to refetch if needed for absolute certainty
      // Or trust optimistic update if points update is confirmed by server logic (not explicitly returned here)
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS });
      
      toast({ title: "Reward Purchased!", description: `You bought ${variables.rewardId}.` }); // Use data.title if available
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS });
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS });
      // syncKeys([CRITICAL_QUERY_KEYS.REWARDS, CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS]);
    },
  });
};
