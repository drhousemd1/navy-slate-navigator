import { type CacheToken, isCurrentCacheToken, requireCurrentCacheToken, captureCacheToken, legacyQueryKey } from '@/data/indexedDB/useIndexedDB';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '../types';
import { useUserIds } from '@/contexts/UserIdsContext';
import { REWARDS_QUERY_KEY } from '../queries';
import { getISOWeekString } from '@/lib/dateUtils';
import { USER_DOM_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserDomPointsQuery';

interface RedeemDomRewardVariables {
  rewardId: string;
  currentSupply: number;
  profileId: string;
}

interface RedeemDomRewardOptimisticContext {
  cacheToken: CacheToken | null;
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
  const cacheToken = captureCacheToken();
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  const rewardsQueryKey = legacyQueryKey(REWARDS_QUERY_KEY, cacheToken);

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
      requireCurrentCacheToken(cacheToken);
      await queryClient.cancelQueries({ queryKey: rewardsQueryKey });
      requireCurrentCacheToken(cacheToken);
      const previousRewards = queryClient.getQueryData<Reward[]>(rewardsQueryKey);

      queryClient.setQueryData<Reward[]>(rewardsQueryKey, (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply - 1 }
            : reward
        )
      );
      return { previousRewards , cacheToken };
    },
    onError: (err, variables, context) => {
      const cacheToken = context?.cacheToken ?? null;
      if (!isCurrentCacheToken(cacheToken)) return;
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(rewardsQueryKey, context.previousRewards);
      }
    },
    onSuccess: (data, variables, context) => {
      const cacheToken = context?.cacheToken ?? null;
      if (!isCurrentCacheToken(cacheToken)) return;
      queryClient.setQueryData<Reward[]>(rewardsQueryKey, (oldRewards = []) => {
        return oldRewards.map(r => r.id === data.id ? data : r);
      });

      queryClient.invalidateQueries({ queryKey: ['reward-usage', variables.rewardId] });
    },
    onSettled: (_data, _error, _variables, context) => {
      const cacheToken = context?.cacheToken ?? null;
      if (!isCurrentCacheToken(cacheToken)) return;
      // Only invalidate reward usage queries, NOT the rewards cache
      queryClient.invalidateQueries({ queryKey: ['reward-usage'] });
      queryClient.invalidateQueries({ queryKey: legacyQueryKey([USER_DOM_POINTS_QUERY_KEY_PREFIX, domUserId], cacheToken) });
      // REMOVED: queryClient.invalidateQueries({ queryKey: rewardsQueryKey }) - this was causing supply reset
    },
  });
};
