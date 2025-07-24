
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Reward } from '@/data/rewards/types';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { useUserIds } from '@/contexts/UserIdsContext';
import { usePartnerHelper } from '@/hooks/usePartnerHelper';
import { usePushNotifications } from '@/hooks/usePushNotifications';

import { USER_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserPointsQuery';
import { REWARDS_QUERY_KEY } from '@/data/rewards/queries';

interface BuySubRewardVars { 
  rewardId: string; 
  cost: number; 
  currentSupply: number; 
  currentPoints: number;
  rewardTitle?: string;
}

interface BuySubRewardOptimisticContext {
  previousRewards?: Reward[];
  previousPoints?: number;
}

export const useBuySubReward = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();
  const { getPartnerId } = usePartnerHelper();
  const { sendRewardPurchasedNotification } = usePushNotifications();

  const rewardsQueryKey = [...REWARDS_QUERY_KEY, subUserId, domUserId];

  return useMutation<Reward, Error, BuySubRewardVars, BuySubRewardOptimisticContext>({
    mutationFn: async ({ rewardId, cost, currentSupply, currentPoints }) => {
      try {
        if (!subUserId) {
          throw new Error("User not authenticated");
        }

        if (currentPoints < cost) {
          throw new Error("Not enough points to purchase this reward.");
        }

        const newSupply = currentSupply + 1;

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
      await queryClient.cancelQueries({ queryKey: rewardsQueryKey });
      const userPointsQueryKey = [USER_POINTS_QUERY_KEY_PREFIX, subUserId];
      await queryClient.cancelQueries({ queryKey: userPointsQueryKey });

      const previousRewards = queryClient.getQueryData<Reward[]>(rewardsQueryKey);
      const previousPoints = queryClient.getQueryData<number>(userPointsQueryKey);

      queryClient.setQueryData<Reward[]>(rewardsQueryKey, (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply + 1 }
            : reward
        )
      );

      queryClient.setQueryData<number>(userPointsQueryKey, (oldUserPoints = 0) =>
        (oldUserPoints || 0) - variables.cost
      );
      
      return { previousRewards, previousPoints };
    },
    onSuccess: async (data, variables) => {
      queryClient.setQueryData<Reward[]>(rewardsQueryKey, (oldRewards = []) => 
        oldRewards.map(r => r.id === data.id ? data : r)
      );
      
      // Send push notification to partner about reward purchase
      const partnerId = await getPartnerId();
      if (partnerId) {
        try {
          await sendRewardPurchasedNotification(
            partnerId, 
            variables.rewardTitle || 'A reward', 
            variables.cost
          );
        } catch (error) {
          logger.error('Failed to send reward purchase notification:', error);
        }
      }
      
      await queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, subUserId] });
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(rewardsQueryKey, context.previousRewards);
      }
      if (context?.previousPoints !== undefined) {
        const userPointsQueryKey = [USER_POINTS_QUERY_KEY_PREFIX, subUserId];
        queryClient.setQueryData<number>(userPointsQueryKey, context.previousPoints);
      }
    },
    onSettled: async (data, error, variables) => {
      await queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, subUserId] });
      // REMOVED: queryClient.invalidateQueries({ queryKey: rewardsQueryKey }) - this was causing supply reset
    }
  });
};
