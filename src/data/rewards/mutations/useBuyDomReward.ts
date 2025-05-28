
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/data/rewards/types';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

import { USER_DOM_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserDomPointsQuery';
import { SUB_REWARD_TYPES_COUNT_QUERY_KEY } from '@/data/rewards/queries/useSubRewardTypesCountQuery';
import { DOM_REWARD_TYPES_COUNT_QUERY_KEY } from '@/data/rewards/queries/useDomRewardTypesCountQuery';

const REWARDS_QUERY_KEY = ['rewards'];

interface BuyDomRewardVars { 
  rewardId: string; 
  cost: number; 
  currentSupply: number; 
  profileId: string;
  currentDomPoints: number 
}

interface BuyDomRewardOptimisticContext {
  previousRewards?: Reward[];
  previousDomPoints?: number;
}

export const useBuyDomReward = () => {
  const queryClient = useQueryClient();

  return useMutation<Reward, Error, BuyDomRewardVars, BuyDomRewardOptimisticContext>({
    mutationFn: async ({ rewardId, cost, currentSupply, profileId, currentDomPoints }) => {
      try {
        if (currentDomPoints < cost) {
          throw new Error("Not enough DOM points to purchase this reward.");
        }

        // Increase supply when buying (you now own one more)
        const newSupply = currentSupply === -1 ? currentSupply : currentSupply + 1;

        // Update reward supply
        const { error: supplyError } = await supabase
          .from('rewards')
          .update({ supply: newSupply })
          .eq('id', rewardId);
        if (supplyError) throw supplyError;

        // Update profile DOM points
        const newPoints = currentDomPoints - cost;
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ dom_points: newPoints })
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
        if (!updatedReward) throw new Error('Failed to fetch updated DOM reward after purchase.');

        return updatedReward as Reward;

      } catch (error: unknown) {
        logger.error("Error buying DOM reward:", getErrorMessage(error));
        throw new Error(getErrorMessage(error));
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      const userDomPointsQueryKey = [USER_DOM_POINTS_QUERY_KEY_PREFIX, variables.profileId];
      await queryClient.cancelQueries({ queryKey: userDomPointsQueryKey });

      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);
      const previousDomPoints = queryClient.getQueryData<number>(userDomPointsQueryKey);

      // Optimistically increase supply when buying
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply === -1 ? -1 : reward.supply + 1 }
            : reward
        )
      );

      // Optimistically update user DOM points
      queryClient.setQueryData<number>(userDomPointsQueryKey, (oldUserDomPoints = 0) =>
        (oldUserDomPoints || 0) - variables.cost
      );
      
      return { previousRewards, previousDomPoints };
    },
    onSuccess: async (data, variables) => {
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldRewards = []) => 
        oldRewards.map(r => r.id === data.id ? data : r)
      );

      await queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [USER_DOM_POINTS_QUERY_KEY_PREFIX, variables.profileId] });
      await queryClient.invalidateQueries({ queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY] });
      await queryClient.invalidateQueries({ queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY] });
      
      toast({
        title: "DOM Reward Purchased",
        description: `You bought ${data.title}!`,
      });
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards);
      }
      if (context?.previousDomPoints !== undefined) {
        const userDomPointsQueryKey = [USER_DOM_POINTS_QUERY_KEY_PREFIX, variables.profileId];
        queryClient.setQueryData<number>(userDomPointsQueryKey, context.previousDomPoints);
      }

      toast({
        title: "Purchase Failed",
        description: `Failed to purchase DOM reward: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: async (data, error, variables) => {
      await queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [USER_DOM_POINTS_QUERY_KEY_PREFIX, variables.profileId] });
    }
  });
};
