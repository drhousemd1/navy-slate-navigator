
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/data/rewards/types'; // Import Reward type
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

import { USER_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserPointsQuery';
import { SUB_REWARD_TYPES_COUNT_QUERY_KEY } from '@/data/rewards/queries/useSubRewardTypesCountQuery';
import { DOM_REWARD_TYPES_COUNT_QUERY_KEY } from '@/data/rewards/queries/useDomRewardTypesCountQuery';

const REWARDS_QUERY_KEY = ['rewards'];

interface BuySubRewardVars { 
  rewardId: string; 
  cost: number; 
  currentSupply: number; 
  profileId: string; // This is the subUserId
  currentPoints: number 
}

// Response type is now the full Reward object
// interface BuySubRewardResponse { 
//   rewardId: string; 
//   newSupply: number; 
//   newPoints: number 
// }

interface BuySubRewardOptimisticContext {
  previousRewards?: Reward[];
  previousPoints?: number;
}

export const useBuySubReward = () => {
  const queryClient = useQueryClient();

  return useMutation<Reward, Error, BuySubRewardVars, BuySubRewardOptimisticContext>({
    mutationFn: async ({ rewardId, cost, currentSupply, profileId, currentPoints }) => {
      try {
        if (currentPoints < cost) {
          throw new Error("Not enough points to purchase this reward.");
        }

        if (currentSupply === 0) {
          throw new Error("This reward is currently out of stock.");
        }

        const newSupply = currentSupply === -1 ? currentSupply : currentSupply - 1;

        // Update reward supply
        const { error: supplyError } = await supabase
          .from('rewards')
          .update({ supply: newSupply })
          .eq('id', rewardId);
        if (supplyError) throw supplyError;

        // Update profile points
        const newPoints = currentPoints - cost;
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ points: newPoints })
          .eq('id', profileId);
        
        if (profileError) {
          // Rollback supply update if points update fails
          await supabase.from('rewards').update({ supply: currentSupply }).eq('id', rewardId);
          throw profileError;
        }

        // Fetch the updated reward
        const { data: updatedReward, error: fetchError } = await supabase
          .from('rewards')
          .select('*')
          .eq('id', rewardId)
          .single();

        if (fetchError) throw fetchError;
        if (!updatedReward) throw new Error('Failed to fetch updated reward after purchase.');
        
        return updatedReward as Reward;

      } catch (error: unknown) {
        logger.error("Error buying sub reward:", getErrorMessage(error));
        throw new Error(getErrorMessage(error));
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      const userPointsQueryKey = [USER_POINTS_QUERY_KEY_PREFIX, variables.profileId];
      await queryClient.cancelQueries({ queryKey: userPointsQueryKey });

      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);
      const previousPoints = queryClient.getQueryData<number>(userPointsQueryKey);

      // Optimistically update reward supply
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply === -1 ? -1 : reward.supply - 1 }
            : reward
        )
      );

      // Optimistically update user points
      queryClient.setQueryData<number>(userPointsQueryKey, (oldUserPoints = 0) =>
        (oldUserPoints || 0) - variables.cost
      );
      
      return { previousRewards, previousPoints };
    },
    onSuccess: async (data, variables) => {
      // data is the full updated Reward object from mutationFn
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldRewards = []) => 
        oldRewards.map(r => r.id === data.id ? data : r)
      );
      
      // Invalidate queries to refetch fresh data
      await queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, variables.profileId] });
      await queryClient.invalidateQueries({ queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY] });
      await queryClient.invalidateQueries({ queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY] }); // Though this is sub reward, good to be consistent
      
      toast({
        title: "Reward Purchased",
        description: `You bought ${data.title}!`,
      });
    },
    onError: (error: Error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards);
      }
      if (context?.previousPoints !== undefined) {
        const userPointsQueryKey = [USER_POINTS_QUERY_KEY_PREFIX, variables.profileId];
        queryClient.setQueryData<number>(userPointsQueryKey, context.previousPoints);
      }

      toast({
        title: "Purchase Failed",
        description: `Failed to purchase reward: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: async (data, error, variables) => {
      // Ensure necessary queries are refetched
      await queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, variables.profileId] });
    }
  });
};
