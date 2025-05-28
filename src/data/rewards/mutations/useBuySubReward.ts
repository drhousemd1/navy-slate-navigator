
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/data/rewards/types';
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
  profileId: string;
  currentPoints: number 
}

interface BuySubRewardOptimisticContext {
  previousRewards?: Reward[];
  previousPoints?: number;
  previousSubCount?: number;
}

export const useBuySubReward = () => {
  const queryClient = useQueryClient();

  return useMutation<Reward, Error, BuySubRewardVars, BuySubRewardOptimisticContext>({
    mutationFn: async ({ rewardId, cost, currentSupply, profileId, currentPoints }) => {
      try {
        if (currentPoints < cost) {
          throw new Error("Not enough points to purchase this reward.");
        }

        // Increase supply when buying (you now own one more)
        const newSupply = currentSupply === -1 ? currentSupply : currentSupply + 1;

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
      await queryClient.cancelQueries({ queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY] });

      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);
      const previousPoints = queryClient.getQueryData<number>(userPointsQueryKey);
      const previousSubCount = queryClient.getQueryData<number>([SUB_REWARD_TYPES_COUNT_QUERY_KEY]);

      // Optimistically increase supply when buying
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply === -1 ? -1 : reward.supply + 1 }
            : reward
        )
      );

      // Optimistically update user points
      queryClient.setQueryData<number>(userPointsQueryKey, (oldUserPoints = 0) =>
        (oldUserPoints || 0) - variables.cost
      );

      // Optimistically update sub reward count
      queryClient.setQueryData<number>([SUB_REWARD_TYPES_COUNT_QUERY_KEY], (old = 0) => old + 1);
      
      return { previousRewards, previousPoints, previousSubCount };
    },
    onSuccess: async (data, variables) => {
      // Immediately update the cache with the actual data from the server
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldRewards = []) => 
        oldRewards.map(r => r.id === data.id ? data : r)
      );
      
      // Force a fresh fetch to ensure all UI components show the same data
      await queryClient.refetchQueries({ queryKey: REWARDS_QUERY_KEY });
      
      // Invalidate all related queries to ensure fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, variables.profileId] }),
        queryClient.invalidateQueries({ queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY] })
      ]);
      
      // Always show toast on successful purchase
      toast({
        title: "Reward Purchased",
        description: `You bought ${data.title}!`,
      });
    },
    onError: (error: Error, variables, context) => {
      // Restore previous state on error
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards);
      }
      if (context?.previousPoints !== undefined) {
        const userPointsQueryKey = [USER_POINTS_QUERY_KEY_PREFIX, variables.profileId];
        queryClient.setQueryData<number>(userPointsQueryKey, context.previousPoints);
      }
      if (context?.previousSubCount !== undefined) {
        queryClient.setQueryData<number>([SUB_REWARD_TYPES_COUNT_QUERY_KEY], context.previousSubCount);
      }

      toast({
        title: "Purchase Failed",
        description: `Failed to purchase reward: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: async (data, error, variables) => {
      // Final invalidation to ensure consistency
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, variables.profileId] }),
        queryClient.invalidateQueries({ queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY] })
      ]);
    }
  });
};
