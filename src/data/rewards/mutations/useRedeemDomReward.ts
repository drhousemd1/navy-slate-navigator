
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '../types';
import { useUserIds } from '@/contexts/UserIdsContext';
import { DOM_REWARD_TYPES_COUNT_QUERY_KEY } from '../queries/useDomRewardTypesCountQuery';
import { REWARDS_QUERY_KEY } from '../queries';
import { getISOWeekString } from '@/lib/dateUtils';
import { USER_DOM_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserDomPointsQuery';

interface RedeemDomRewardVariables {
  rewardId: string;
  currentSupply: number;
  profileId: string;
}

interface RedeemDomRewardOptimisticContext {
  previousRewards?: Reward[];
}

const recordRewardUsage = async (rewardId: string, userId: string) => {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // Convert to Monday=0 format
  const weekNumber = getISOWeekString(now);

  await supabase
    .from('reward_usage')
    .insert({
      reward_id: rewardId,
      day_of_week: dayOfWeek,
      week_number: weekNumber,
      used: true,
      user_id: userId
    });
};

export const useRedeemDomReward = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  const rewardsQueryKey = [...REWARDS_QUERY_KEY, subUserId, domUserId];

  return useMutation<Reward, Error, RedeemDomRewardVariables, RedeemDomRewardOptimisticContext>({
    mutationFn: async ({ rewardId, currentSupply }) => {
      if (!domUserId) {
        throw new Error("User not authenticated");
      }

      if (currentSupply <= 0) {
        throw new Error("Reward is out of stock, cannot use.");
      }
      const newSupply = currentSupply - 1;

      const { error: supplyError } = await supabase
        .from('rewards')
        .update({ supply: newSupply })
        .eq('id', rewardId);

      if (supplyError) throw supplyError;

      await recordRewardUsage(rewardId, domUserId);

      const { data: updatedReward, error: fetchError } = await supabase
        .from('rewards')
        .select('*')
        .eq('id', rewardId)
        .single();

      if (fetchError) throw fetchError;
      if (!updatedReward) throw new Error('Failed to fetch updated reward after redeeming.');
      
      return updatedReward as Reward;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: rewardsQueryKey });
      const previousRewards = queryClient.getQueryData<Reward[]>(rewardsQueryKey);

      queryClient.setQueryData<Reward[]>(rewardsQueryKey, (old = []) =>
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
        queryClient.setQueryData<Reward[]>(rewardsQueryKey, context.previousRewards);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<Reward[]>(rewardsQueryKey, (oldRewards = []) => {
        return oldRewards.map(r => r.id === data.id ? data : r);
      });
      
      queryClient.invalidateQueries({ queryKey: ['reward-usage', variables.rewardId] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rewardsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['reward-usage'] });
      queryClient.invalidateQueries({ queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY] });
      // Add DOM points cache invalidation for dom rewards
      queryClient.invalidateQueries({ queryKey: [USER_DOM_POINTS_QUERY_KEY_PREFIX, domUserId] });
    },
  });
};
