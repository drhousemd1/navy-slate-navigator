
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/data/RewardsDataHandler'; // Ensure Reward type is imported

// Query keys (ensure these are consistent with where they are defined/used)
const REWARDS_QUERY_KEY = ['rewards'];
const PROFILE_POINTS_QUERY_KEY = ['profile_points'];

export interface BuySubRewardVariables {
  rewardId: string;
  cost: number;
  currentSupply: number;
  profileId: string;
  currentPoints: number;
}

export interface BuySubRewardResult {
  success: boolean;
  message: string;
  updatedReward: Reward; // The reward with updated supply
  newPoints: number;     // User's new point total
  rewardTitle: string;   // Title of the reward for messages
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

      // 1. Decrement reward supply
      const { data: rewardData, error: rewardError } = await supabase
        .from('rewards')
        .update({ supply: currentSupply - 1, updated_at: new Date().toISOString() })
        .eq('id', rewardId)
        .select()
        .single();

      if (rewardError || !rewardData) {
        throw new Error(rewardError?.message || 'Failed to update reward supply.');
      }

      // 2. Deduct points from user
      const newPoints = currentPoints - cost;
      const { error: pointsError } = await supabase
        .from('profiles')
        .update({ points: newPoints, updated_at: new Date().toISOString() })
        .eq('id', profileId);

      if (pointsError) {
        // Attempt to rollback reward supply if points deduction failed
        await supabase
          .from('rewards')
          .update({ supply: currentSupply, updated_at: new Date().toISOString() })
          .eq('id', rewardId);
        throw new Error(pointsError.message || 'Failed to deduct points.');
      }
      
      // 3. Optionally, record the transaction (if a table for that exists)
      // Example: await supabase.from('reward_transactions').insert({...});

      return {
        success: true,
        message: 'Reward purchased successfully.',
        updatedReward: rewardData as Reward,
        newPoints,
        rewardTitle: rewardData.title,
      };
    },
    onMutate: async (variables: BuySubRewardVariables) => {
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });

      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);
      const previousPoints = queryClient.getQueryData<number>(PROFILE_POINTS_QUERY_KEY);

      // Optimistically update reward supply
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldRewards = []) =>
        oldRewards.map(r =>
          r.id === variables.rewardId ? { ...r, supply: r.supply - 1 } : r
        )
      );

      // Optimistically update user points
      queryClient.setQueryData<number>(PROFILE_POINTS_QUERY_KEY, (oldPoints = 0) =>
        (oldPoints || 0) - variables.cost
      );

      return { previousRewards, previousPoints };
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic updates
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards);
      }
      if (context?.previousPoints !== undefined) {
        queryClient.setQueryData<number>(PROFILE_POINTS_QUERY_KEY, context.previousPoints);
      }

      toast({
        title: 'Purchase Failed',
        description: error.message || 'Could not purchase Sub Reward.',
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      // Optimistic updates are already applied.
      // Server has confirmed the changes.
      // data.updatedReward and data.newPoints can be used if needed, but cache should be primary source.
      toast({
        title: 'Sub Reward Purchased!',
        description: `You bought ${data.rewardTitle} for ${variables.cost} points.`,
      });
    },
    onSettled: (_data, _error, variables) => {
      // Always refetch/invalidate after the mutation is settled, to ensure consistency
      queryClient.invalidateQueries({ queryKey: [REWARDS_QUERY_KEY, variables.rewardId] }); // Specific reward
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY }); // All rewards list
      queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['rewards', 'supply'] }); // Total supply if it exists
    },
  });
};
