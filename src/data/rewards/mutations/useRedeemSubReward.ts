
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/data/rewards/types';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { getMondayBasedDay, getCurrentWeekKey } from '@/lib/taskUtils';

import { USER_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserPointsQuery';
import { SUB_REWARD_TYPES_COUNT_QUERY_KEY } from '@/data/rewards/queries/useSubRewardTypesCountQuery';
import { DOM_REWARD_TYPES_COUNT_QUERY_KEY } from '@/data/rewards/queries/useDomRewardTypesCountQuery';
import { REWARD_USAGE_QUERY_KEY } from '@/data/rewards/queries/useRewardUsageQuery';

const REWARDS_QUERY_KEY = ['rewards'];

interface RedeemSubRewardVars {
  rewardId: string;
  currentSupply: number;
  profileId: string;
}

interface RedeemSubRewardOptimisticContext {
  previousRewards?: Reward[];
  previousSubCount?: number;
}

export const useRedeemSubReward = () => {
  const queryClient = useQueryClient();

  return useMutation<Reward, Error, RedeemSubRewardVars, RedeemSubRewardOptimisticContext>({
    mutationFn: async ({ rewardId, currentSupply, profileId }) => {
      try {
        if (currentSupply <= 0 && currentSupply !== -1) {
          throw new Error("No rewards available to use.");
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
          logger.error("Error recording reward usage:", usageError);
          // Don't fail the whole operation if usage recording fails
        }

        // Fetch the updated reward
        const { data: updatedReward, error: fetchError } = await supabase
          .from('rewards')
          .select('*')
          .eq('id', rewardId)
          .single();

        if (fetchError) throw fetchError;
        if (!updatedReward) throw new Error('Failed to fetch updated reward after redemption.');

        return updatedReward as Reward;

      } catch (error: unknown) {
        logger.error("Error redeeming sub reward:", getErrorMessage(error));
        throw new Error(getErrorMessage(error));
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY] });

      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);
      const previousSubCount = queryClient.getQueryData<number>([SUB_REWARD_TYPES_COUNT_QUERY_KEY]);

      // Optimistically decrease supply when using
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply === -1 ? -1 : reward.supply - 1 }
            : reward
        )
      );

      // Optimistically update sub reward count
      queryClient.setQueryData<number>([SUB_REWARD_TYPES_COUNT_QUERY_KEY], (old = 0) => Math.max(0, old - 1));

      return { previousRewards, previousSubCount };
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
        queryClient.invalidateQueries({ queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [REWARD_USAGE_QUERY_KEY, variables.rewardId] })
      ]);

      // Always show toast on successful redemption
      toast({
        title: "Reward Used",
        description: `You used ${data.title}!`,
      });
    },
    onError: (error: Error, variables, context) => {
      // Restore previous state on error
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards);
      }
      if (context?.previousSubCount !== undefined) {
        queryClient.setQueryData<number>([SUB_REWARD_TYPES_COUNT_QUERY_KEY], context.previousSubCount);
      }

      toast({
        title: "Usage Failed",
        description: `Failed to use reward: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: async (data, error, variables) => {
      // Final invalidation to ensure consistency
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [REWARD_USAGE_QUERY_KEY, variables.rewardId] })
      ]);
    }
  });
};
