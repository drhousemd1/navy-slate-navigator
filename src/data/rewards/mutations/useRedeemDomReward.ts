
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/data/rewards/types';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { getMondayBasedDay, getCurrentWeekKey } from '@/lib/taskUtils';

import { USER_DOM_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserDomPointsQuery';
import { SUB_REWARD_TYPES_COUNT_QUERY_KEY } from '@/data/rewards/queries/useSubRewardTypesCountQuery';
import { DOM_REWARD_TYPES_COUNT_QUERY_KEY } from '@/data/rewards/queries/useDomRewardTypesCountQuery';
import { REWARD_USAGE_QUERY_KEY } from '@/data/rewards/queries/useRewardUsageQuery';

const REWARDS_QUERY_KEY = ['rewards'];

interface RedeemDomRewardVars {
  rewardId: string;
  currentSupply: number;
  profileId: string;
}

interface RedeemDomRewardOptimisticContext {
  previousRewards?: Reward[];
  previousDomCount?: number;
}

export const useRedeemDomReward = () => {
  const queryClient = useQueryClient();

  return useMutation<Reward, Error, RedeemDomRewardVars, RedeemDomRewardOptimisticContext>({
    mutationFn: async ({ rewardId, currentSupply, profileId }) => {
      try {
        if (currentSupply <= 0 && currentSupply !== -1) {
          throw new Error("No DOM rewards available to use.");
        }

        // Decrease supply when using (you now own one less)
        const newSupply = currentSupply === -1 ? currentSupply : currentSupply - 1;

        // Update reward supply
        const { error: supplyError } = await supabase
          .from('rewards')
          .update({ supply: newSupply })
          .eq('id', rewardId);
        if (supplyError) throw supplyError;

        // Record usage in reward_usage table
        const currentDay = getMondayBasedDay();
        const weekKey = getCurrentWeekKey();
        
        const { error: usageError } = await supabase
          .from('reward_usage')
          .upsert({
            reward_id: rewardId,
            day_of_week: currentDay,
            week_number: weekKey,
            used: true
          }, {
            onConflict: 'reward_id,day_of_week,week_number'
          });
        
        if (usageError) {
          logger.error("Error recording DOM reward usage:", usageError);
          // Don't fail the whole operation if usage recording fails
        }

        // Fetch the updated reward
        const { data: updatedReward, error: fetchError } = await supabase
          .from('rewards')
          .select('*')
          .eq('id', rewardId)
          .single();

        if (fetchError) throw fetchError;
        if (!updatedReward) throw new Error('Failed to fetch updated DOM reward after redemption.');

        return updatedReward as Reward;

      } catch (error: unknown) {
        logger.error("Error redeeming DOM reward:", getErrorMessage(error));
        throw new Error(getErrorMessage(error));
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      await queryClient.cancelateQueries({ queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY] });

      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);
      const previousDomCount = queryClient.getQueryData<number>([DOM_REWARD_TYPES_COUNT_QUERY_KEY]);

      // Optimistically decrease supply when using
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply === -1 ? -1 : reward.supply - 1 }
            : reward
        )
      );

      // Optimistically update DOM reward count
      queryClient.setQueryData<number>([DOM_REWARD_TYPES_COUNT_QUERY_KEY], (old = 0) => Math.max(0, old - 1));

      return { previousRewards, previousDomCount };
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
        queryClient.invalidateQueries({ queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [REWARD_USAGE_QUERY_KEY, variables.rewardId] })
      ]);

      // Always show toast on successful redemption
      toast({
        title: "DOM Reward Used",
        description: `You used ${data.title}!`,
      });
    },
    onError: (error: Error, variables, context) => {
      // Restore previous state on error
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards);
      }
      if (context?.previousDomCount !== undefined) {
        queryClient.setQueryData<number>([DOM_REWARD_TYPES_COUNT_QUERY_KEY], context.previousDomCount);
      }

      toast({
        title: "Usage Failed",
        description: `Failed to use DOM reward: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: async (data, error, variables) => {
      // Final invalidation to ensure consistency
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [REWARD_USAGE_QUERY_KEY, variables.rewardId] })
      ]);
    }
  });
};
