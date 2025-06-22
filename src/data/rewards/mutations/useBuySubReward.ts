
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toastManager } from '@/lib/toastManager';
import { Reward } from '@/data/rewards/types';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { useUserIds } from '@/contexts/UserIdsContext';

import { USER_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserPointsQuery';
import { SUB_REWARD_TYPES_COUNT_QUERY_KEY } from '@/data/rewards/queries/useSubRewardTypesCountQuery';
import { DOM_REWARD_TYPES_COUNT_QUERY_KEY } from '@/data/rewards/queries/useDomRewardTypesCountQuery';

const REWARDS_QUERY_KEY = ['rewards'];

interface BuySubRewardVars { 
  rewardId: string; 
  cost: number; 
  currentSupply: number; 
  currentPoints: number 
}

interface BuySubRewardOptimisticContext {
  previousRewards?: Reward[];
  previousPoints?: number;
  previousSubCount?: number;
}

export const useBuySubReward = () => {
  const queryClient = useQueryClient();
  const { subUserId } = useUserIds();

  return useMutation<Reward, Error, BuySubRewardVars, BuySubRewardOptimisticContext>({
    mutationFn: async ({ rewardId, cost, currentSupply, currentPoints }) => {
      try {
        if (!subUserId) {
          throw new Error("User not authenticated");
        }

        if (currentPoints < cost) {
          throw new Error("Not enough points to purchase this reward.");
        }

        const newSupply = currentSupply === -1 ? currentSupply : currentSupply + 1;

        const { error: supplyError } = await supabase
          .from('rewards')
          .update({ supply: newSupply })
          .eq('id', rewardId)
          .eq('user_id', subUserId);

        if (supplyError) throw supplyError;

        const newPoints = currentPoints - cost;
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ points: newPoints })
          .eq('id', subUserId);
        
        if (profileError) {
          await supabase.from('rewards').update({ supply: currentSupply }).eq('id', rewardId).eq('user_id', subUserId);
          throw profileError;
        }

        const { data: updatedReward, error: fetchError } = await supabase
          .from('rewards')
          .select('*')
          .eq('id', rewardId)
          .eq('user_id', subUserId)
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
      const userPointsQueryKey = [USER_POINTS_QUERY_KEY_PREFIX, subUserId];
      await queryClient.cancelQueries({ queryKey: userPointsQueryKey });
      await queryClient.cancelQueries({ queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY] });

      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);
      const previousPoints = queryClient.getQueryData<number>(userPointsQueryKey);
      const previousSubCount = queryClient.getQueryData<number>([SUB_REWARD_TYPES_COUNT_QUERY_KEY]);

      // Optimistically update rewards with increased supply
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply === -1 ? -1 : reward.supply + 1 }
            : reward
        )
      );

      // Optimistically update points
      queryClient.setQueryData<number>(userPointsQueryKey, (oldUserPoints = 0) =>
        (oldUserPoints || 0) - variables.cost
      );

      queryClient.setQueryData<number>([SUB_REWARD_TYPES_COUNT_QUERY_KEY], (old = 0) => old + 1);
      
      return { previousRewards, previousPoints, previousSubCount };
    },
    onSuccess: async (data, variables) => {
      // Update with the actual data from the server
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldRewards = []) => 
        oldRewards.map(r => r.id === data.id ? data : r)
      );
      
      // Invalidate related queries to ensure fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, subUserId] }),
        queryClient.invalidateQueries({ queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY })
      ]);
      
      toastManager.success("Reward Purchased", `You bought ${data.title}!`);
    },
    onError: (error: Error, variables, context) => {
      // Revert optimistic updates on error
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards);
      }
      if (context?.previousPoints !== undefined) {
        const userPointsQueryKey = [USER_POINTS_QUERY_KEY_PREFIX, subUserId];
        queryClient.setQueryData<number>(userPointsQueryKey, context.previousPoints);
      }
      if (context?.previousSubCount !== undefined) {
        queryClient.setQueryData<number>([SUB_REWARD_TYPES_COUNT_QUERY_KEY], context.previousSubCount);
      }

      toastManager.error("Purchase Failed", `Failed to purchase reward: ${error.message}`);
    },
    onSettled: async (data, error, variables) => {
      // Always invalidate to ensure consistency
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, subUserId] }),
        queryClient.invalidateQueries({ queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY })
      ]);
    }
  });
};
