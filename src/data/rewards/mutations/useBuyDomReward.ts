
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toastManager } from '@/lib/toastManager';
import { Reward } from '@/data/rewards/types';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { useUserIds } from '@/contexts/UserIdsContext';

import { USER_DOM_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserDomPointsQuery';
import { SUB_REWARD_TYPES_COUNT_QUERY_KEY } from '@/data/rewards/queries/useSubRewardTypesCountQuery';
import { DOM_REWARD_TYPES_COUNT_QUERY_KEY } from '@/data/rewards/queries/useDomRewardTypesCountQuery';

const REWARDS_QUERY_KEY = ['rewards'];

interface BuyDomRewardVars { 
  rewardId: string; 
  cost: number; 
  currentSupply: number; 
  currentDomPoints: number 
}

interface BuyDomRewardOptimisticContext {
  previousRewards?: Reward[];
  previousDomPoints?: number;
  previousDomCount?: number;
}

export const useBuyDomReward = () => {
  const queryClient = useQueryClient();
  const { domUserId } = useUserIds();

  return useMutation<Reward, Error, BuyDomRewardVars, BuyDomRewardOptimisticContext>({
    mutationFn: async ({ rewardId, cost, currentSupply, currentDomPoints }) => {
      try {
        if (!domUserId) {
          throw new Error("User not authenticated");
        }

        if (currentDomPoints < cost) {
          throw new Error("Not enough DOM points to purchase this reward.");
        }

        const newSupply = currentSupply === -1 ? currentSupply : currentSupply + 1;

        const { error: supplyError } = await supabase
          .from('rewards')
          .update({ supply: newSupply })
          .eq('id', rewardId)
          .eq('user_id', domUserId);

        if (supplyError) throw supplyError;

        const newPoints = currentDomPoints - cost;
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ dom_points: newPoints })
          .eq('id', domUserId);

        if (profileError) {
          await supabase.from('rewards').update({ supply: currentSupply }).eq('id', rewardId).eq('user_id', domUserId);
          throw profileError;
        }
        
        const { data: updatedReward, error: fetchError } = await supabase
          .from('rewards')
          .select('*')
          .eq('id', rewardId)
          .eq('user_id', domUserId)
          .single();

        if (fetchError) throw fetchError;
        if (!updatedReward) throw new Error('Failed to fetch updated DOM reward after purchase.');

        return updatedReward as Reward;

      } catch (error: unknown) {
        logger.error("Error buying DOM reward:", getErrorMessage(error));
        throw new Error(getErrorMessage(error));
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      const userDomPointsQueryKey = [USER_DOM_POINTS_QUERY_KEY_PREFIX, domUserId];
      await queryClient.cancelQueries({ queryKey: userDomPointsQueryKey });
      await queryClient.cancelQueries({ queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY] });

      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);
      const previousDomPoints = queryClient.getQueryData<number>(userDomPointsQueryKey);
      const previousDomCount = queryClient.getQueryData<number>([DOM_REWARD_TYPES_COUNT_QUERY_KEY]);

      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply === -1 ? -1 : reward.supply + 1 }
            : reward
        )
      );

      queryClient.setQueryData<number>(userDomPointsQueryKey, (oldUserDomPoints = 0) =>
        (oldUserDomPoints || 0) - variables.cost
      );

      queryClient.setQueryData<number>([DOM_REWARD_TYPES_COUNT_QUERY_KEY], (old = 0) => old + 1);
      
      return { previousRewards, previousDomPoints, previousDomCount };
    },
    onSuccess: async (data, variables) => {
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldRewards = []) => 
        oldRewards.map(r => r.id === data.id ? data : r)
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [USER_DOM_POINTS_QUERY_KEY_PREFIX, domUserId] }),
        queryClient.invalidateQueries({ queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY] })
      ]);
      
      toastManager.success("DOM Reward Purchased", `You bought ${data.title}!`);
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards);
      }
      if (context?.previousDomPoints !== undefined) {
        const userDomPointsQueryKey = [USER_DOM_POINTS_QUERY_KEY_PREFIX, domUserId];
        queryClient.setQueryData<number>(userDomPointsQueryKey, context.previousDomPoints);
      }
      if (context?.previousDomCount !== undefined) {
        queryClient.setQueryData<number>([DOM_REWARD_TYPES_COUNT_QUERY_KEY], context.previousDomCount);
      }

      toastManager.error("Purchase Failed", `Failed to purchase DOM reward: ${error.message}`);
    },
    onSettled: async (data, error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [USER_DOM_POINTS_QUERY_KEY_PREFIX, domUserId] }),
        queryClient.invalidateQueries({ queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY] })
      ]);
    }
  });
};
