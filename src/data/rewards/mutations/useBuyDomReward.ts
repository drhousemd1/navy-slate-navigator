
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Reward } from '@/data/rewards/types';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { useUserIds } from '@/contexts/UserIdsContext';

import { USER_DOM_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserDomPointsQuery';
import { REWARDS_QUERY_KEY } from '@/data/rewards/queries';

interface BuyDomRewardVars { 
  rewardId: string; 
  cost: number; 
  currentSupply: number; 
  currentDomPoints: number 
}

interface BuyDomRewardOptimisticContext {
  previousRewards?: Reward[];
  previousDomPoints?: number;
}

export const useBuyDomReward = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  const rewardsQueryKey = [...REWARDS_QUERY_KEY, subUserId, domUserId];

  return useMutation<Reward, Error, BuyDomRewardVars, BuyDomRewardOptimisticContext>({
    mutationFn: async ({ rewardId, cost, currentSupply, currentDomPoints }) => {
      try {
        if (!domUserId) {
          throw new Error("User not authenticated");
        }

        if (currentDomPoints < cost) {
          throw new Error("Not enough DOM points to purchase this reward.");
        }

        const newSupply = currentSupply + 1;

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
      await queryClient.cancelQueries({ queryKey: rewardsQueryKey });
      const userDomPointsQueryKey = [USER_DOM_POINTS_QUERY_KEY_PREFIX, domUserId];
      await queryClient.cancelQueries({ queryKey: userDomPointsQueryKey });

      const previousRewards = queryClient.getQueryData<Reward[]>(rewardsQueryKey);
      const previousDomPoints = queryClient.getQueryData<number>(userDomPointsQueryKey);

      queryClient.setQueryData<Reward[]>(rewardsQueryKey, (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply + 1 }
            : reward
        )
      );

      queryClient.setQueryData<number>(userDomPointsQueryKey, (oldUserDomPoints = 0) =>
        (oldUserDomPoints || 0) - variables.cost
      );
      
      return { previousRewards, previousDomPoints };
    },
    onSuccess: async (data, variables) => {
      queryClient.setQueryData<Reward[]>(rewardsQueryKey, (oldRewards = []) => 
        oldRewards.map(r => r.id === data.id ? data : r)
      );

      await queryClient.invalidateQueries({ queryKey: [USER_DOM_POINTS_QUERY_KEY_PREFIX, domUserId] });
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(rewardsQueryKey, context.previousRewards);
      }
      if (context?.previousDomPoints !== undefined) {
        const userDomPointsQueryKey = [USER_DOM_POINTS_QUERY_KEY_PREFIX, domUserId];
        queryClient.setQueryData<number>(userDomPointsQueryKey, context.previousDomPoints);
      }
    },
    onSettled: async (data, error, variables) => {
      await queryClient.invalidateQueries({ queryKey: [USER_DOM_POINTS_QUERY_KEY_PREFIX, domUserId] });
      // REMOVED: queryClient.invalidateQueries({ queryKey: rewardsQueryKey }) - this was causing supply reset
    }
  });
};
