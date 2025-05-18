
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '../types'; // Corrected: Uses types from the same folder
import { toast } from '@/hooks/use-toast';
import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager'; // Assuming this is needed

export interface BuyDomRewardVariables {
  rewardId: string;
  cost: number;
  currentSupply: number; // Reward's total supply
  profileId: string;
  currentDomPoints: number;
}

interface BuyDomRewardOptimisticContext {
  previousRewards?: Reward[];
  previousPoints?: number; 
}

interface BuyDomRewardSuccessData {
  success: boolean;
  newDomPoints: number;
  newSupply: number;
  updatedReward: Reward;
  rewardTitle: string;
}

export const useBuyDomReward = () => {
  const queryClient = useQueryClient();

  return useMutation<
    BuyDomRewardSuccessData,
    Error,
    BuyDomRewardVariables,
    BuyDomRewardOptimisticContext
  >({
    mutationFn: async ({
      rewardId,
      cost,
      currentSupply,
      profileId,
      currentDomPoints
    }) => {
      if (currentDomPoints < cost) {
        throw new Error("Not enough dom points");
      }
      if (currentSupply <= 0) {
        throw new Error("Reward out of stock");
      }

      const newDomPointsResult = currentDomPoints - cost;
      const newSupplyResult = currentSupply - 1;

      const { error: pointsError } = await supabase
        .from('profiles')
        .update({ dom_points: newDomPointsResult, updated_at: new Date().toISOString() })
        .eq('id', profileId);
      if (pointsError) throw pointsError;

      const { data: rewardData, error: rewardError } = await supabase
        .from('rewards')
        .update({ supply: newSupplyResult, updated_at: new Date().toISOString() })
        .eq('id', rewardId)
        .select()
        .single();

      if (rewardError) {
         // Attempt to revert points
        await supabase.from('profiles').update({ dom_points: currentDomPoints }).eq('id', profileId);
        throw rewardError;
      }
      if (!rewardData) throw new Error("Reward data not found after update.");

      return {
        success: true,
        newDomPoints: newDomPointsResult,
        newSupply: newSupplyResult,
        updatedReward: rewardData as Reward,
        rewardTitle: rewardData?.title || "Dom Reward"
      };
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS });
      await queryClient.cancelQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS });

      const previousRewards = queryClient.getQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS);
      // previousPoints for dom_points should be a number
      const previousPoints = queryClient.getQueryData<number>(CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS);

      queryClient.setQueryData<number>(CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS, (oldPoints = 0) =>
        (oldPoints || 0) - variables.cost
      );

      queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, (oldRewards = []) =>
        oldRewards.map(reward =>
          reward.id === variables.rewardId ? { ...reward, supply: reward.supply - 1 } : reward
        )
      );

      return { previousRewards, previousPoints };
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Dom Reward Purchased",
        description: `You have successfully purchased ${data.rewardTitle}!`,
      });
      // Data already set optimistically, ensure invalidation for consistency
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS });
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS });
    },
    onError: (error, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData(CRITICAL_QUERY_KEYS.REWARDS, context.previousRewards);
      }
      if (context?.previousPoints !== undefined) {
        queryClient.setQueryData(CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS, context.previousPoints);
      }
      console.error('Error buying dom reward:', error);
      toast({
        title: "Failed to Purchase",
        description: error.message || "There was a problem purchasing this reward.",
        variant: "destructive",
      });
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS });
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS });
      if (variables?.rewardId) {
        queryClient.invalidateQueries({ queryKey: [CRITICAL_QUERY_KEYS.REWARDS, variables.rewardId] });
      }
    },
  });
};
