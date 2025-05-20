import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/data/rewards/types';
import { PROFILE_POINTS_QUERY_KEY_BASE, getProfilePointsQueryKey } from '@/data/points/usePointsManager';

interface BuyDomRewardArgs {
  rewardId: string;
  cost: number;
  currentSupply: number; 
  profileId: string;
  currentDomPoints: number;
}

interface BuyDomRewardOptimisticContext {
  previousRewards?: Reward[];
  previousProfilePoints?: { points: number, dom_points: number };
}

export const useBuyDomReward = () => {
  const queryClient = useQueryClient();
  const userProfilePointsKey = (profileId: string) => getProfilePointsQueryKey(profileId);

  return useMutation<Reward, Error, BuyDomRewardArgs, BuyDomRewardOptimisticContext>({
      mutationFn: async ({ rewardId, cost, currentSupply, profileId, currentDomPoints }) => {
        // The original logic implies "buying" decrements the reward's available stock.
        // And "redeeming" or "using" would decrement a user's owned stock (if that's tracked separately).
        // Current 'supply' on Reward table seems to be total available stock.
        // If buying means user gets one, and reward stock decreases:
        if (currentSupply <= 0) { // This refers to the reward's supply in the DB
          throw new Error("Reward is out of stock.");
        }
        if (currentDomPoints < cost) {
          throw new Error("Not enough Dom points.");
        }

        const newSupply = currentSupply - 1; // Decrement reward's total supply
        const newDomPoints = currentDomPoints - cost;

        // Update reward supply
        const { error: supplyError } = await supabase
          .from('rewards')
          .update({ supply: newSupply })
          .eq('id', rewardId);

        if (supplyError) throw supplyError;

        // Update user's Dom points
        const { error: pointsError } = await supabase
          .from('profiles')
          .update({ dom_points: newDomPoints, updated_at: new Date().toISOString() })
          .eq('id', profileId);

        if (pointsError) {
          // Attempt to revert supply update
          await supabase.from('rewards').update({ supply: currentSupply }).eq('id', rewardId);
          throw pointsError;
        }
        
        const { data: updatedReward, error: fetchError } = await supabase
          .from('rewards')
          .select('*')
          .eq('id', rewardId)
          .single();

        if (fetchError) throw fetchError;
        if (!updatedReward) throw new Error('Failed to fetch updated reward after purchase.');
        
        return updatedReward as Reward;
      },
      onMutate: async (variables) => {
        const profileKey = userProfilePointsKey(variables.profileId);
        await queryClient.cancelQueries({ queryKey: ['rewards'] });
        await queryClient.cancelQueries({ queryKey: profileKey });
        await queryClient.cancelQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE]}); // Also cancel base for current user if different

        const previousRewards = queryClient.getQueryData<Reward[]>(['rewards']);
        const previousProfilePoints = queryClient.getQueryData<{ points: number, dom_points: number }>(profileKey);
        
        queryClient.setQueryData<Reward[]>(['rewards'], (old = []) =>
          old.map(reward =>
            reward.id === variables.rewardId
              ? { ...reward, supply: reward.supply - 1 } 
              : reward
          )
        );

        queryClient.setQueryData<{ points: number, dom_points: number }>(profileKey, (old) => ({
            points: old?.points ?? 0, // Sub points unchanged
            dom_points: (old?.dom_points ?? variables.currentDomPoints) - variables.cost,
        }));
        
        return { previousRewards, previousProfilePoints };
      },
      onError: (err, variables, context) => {
        if (context?.previousRewards) {
          queryClient.setQueryData<Reward[]>(['rewards'], context.previousRewards);
        }
        if (context?.previousProfilePoints) {
          queryClient.setQueryData(userProfilePointsKey(variables.profileId), context.previousProfilePoints);
        }
        toast({ title: "Purchase Failed", description: err.message, variant: "destructive" });
      },
      onSuccess: (data, variables) => {
        queryClient.setQueryData<Reward[]>(['rewards'], (oldRewards = []) => {
          return oldRewards.map(r => r.id === data.id ? data : r);
        });
        // No need to setQueryData for points, invalidation will refetch the true state.
        toast({ title: "Reward Purchased!", description: `You bought ${data.title}.` });
      },
      onSettled: (_data, _error, variables) => { // Added variables to onSettled
        queryClient.invalidateQueries({ queryKey: ['rewards'] });
        queryClient.invalidateQueries({ queryKey: userProfilePointsKey(variables.profileId) });
        queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] }); // General invalidation for current user
      },
    }
  );
};
