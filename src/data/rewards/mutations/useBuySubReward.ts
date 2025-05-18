
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Reward } from '../types'; // Corrected path
import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager'; // Assuming this is needed

export interface BuySubRewardVariables {
  rewardId: string;
  cost: number;
  currentSupply: number; // Reward's total supply
  profileId: string;
  currentPoints: number;
}

export interface BuySubRewardResult {
  success: boolean;
  message: string;
  updatedReward: Reward;
  newPoints: number;
  rewardTitle: string;
}

interface BuySubRewardOptimisticContext {
  previousRewards?: Reward[];
  previousPoints?: number;
}

export const useBuySubReward = () => {
  const queryClient = useQueryClient();

  return useMutation<BuySubRewardResult, Error, BuySubRewardVariables, BuySubRewardOptimisticContext>({
    mutationFn: async (variables: BuySubRewardVariables): Promise<BuySubRewardResult> => {
      const { rewardId, cost, currentSupply, profileId, currentPoints } = variables;

      if (currentPoints < cost) {
        throw new Error('Not enough points.');
      }
      if (currentSupply <= 0) {
        throw new Error('Reward is out of stock.');
      }

      const newPointsResult = currentPoints - cost;
      const newSupplyResult = currentSupply - 1;

      const { data: rewardData, error: rewardError } = await supabase
        .from('rewards')
        .update({ supply: newSupplyResult, updated_at: new Date().toISOString() })
        .eq('id', rewardId)
        .select()
        .single();

      if (rewardError || !rewardData) {
         // Attempt to rollback (though points haven't been touched yet if this fails first)
        throw new Error(rewardError?.message || 'Failed to update reward supply.');
      }
      
      const { error: pointsError } = await supabase
        .from('profiles')
        .update({ points: newPointsResult, updated_at: new Date().toISOString() })
        .eq('id', profileId);

      if (pointsError) {
        await supabase
          .from('rewards')
          .update({ supply: currentSupply, updated_at: new Date().toISOString() })
          .eq('id', rewardId);
        throw new Error(pointsError.message || 'Failed to deduct points.');
      }
      
      return {
        success: true,
        message: 'Reward purchased successfully.',
        updatedReward: rewardData as Reward,
        newPoints: newPointsResult,
        rewardTitle: rewardData.title,
      };
    },
    onMutate: async (variables: BuySubRewardVariables) => {
      await queryClient.cancelQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS });
      await queryClient.cancelQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_POINTS });

      const previousRewards = queryClient.getQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS);
      const previousPoints = queryClient.getQueryData<number>(CRITICAL_QUERY_KEYS.REWARDS_POINTS);

      queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, (oldRewards = []) =>
        oldRewards.map(r =>
          r.id === variables.rewardId ? { ...r, supply: r.supply - 1 } : r
        )
      );

      queryClient.setQueryData<number>(CRITICAL_QUERY_KEYS.REWARDS_POINTS, (oldPoints = 0) =>
        (oldPoints || 0) - variables.cost
      );

      return { previousRewards, previousPoints };
    },
    onError: (error, _variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, context.previousRewards);
      }
      if (context?.previousPoints !== undefined) {
        queryClient.setQueryData<number>(CRITICAL_QUERY_KEYS.REWARDS_POINTS, context.previousPoints);
      }
      toast({
        title: 'Purchase Failed',
        description: error.message || 'Could not purchase Sub Reward.',
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Sub Reward Purchased!',
        description: `You bought ${data.rewardTitle} for ${variables.cost} points.`,
      });
      queryClient.invalidateQueries({queryKey: CRITICAL_QUERY_KEYS.REWARDS });
      queryClient.invalidateQueries({queryKey: CRITICAL_QUERY_KEYS.REWARDS_POINTS });
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: [CRITICAL_QUERY_KEYS.REWARDS, variables.rewardId] });
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS });
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_POINTS });
    },
  });
};
