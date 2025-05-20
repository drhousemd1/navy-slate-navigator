import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/data/rewards/types';
import { PROFILE_POINTS_QUERY_KEY_BASE, getProfilePointsQueryKey } from '@/data/points/usePointsManager';

interface BuySubRewardArgs {
  rewardId: string;
  cost: number;
  currentSupply: number; 
  profileId: string;
  currentPoints: number;
}

interface BuySubRewardOptimisticContext {
  previousRewards?: Reward[];
  previousProfilePoints?: { points: number, dom_points: number };
}

export const useBuySubReward = () => {
  const queryClient = useQueryClient();
  const userProfilePointsKey = (profileId: string) => getProfilePointsQueryKey(profileId);

  return useMutation<Reward, Error, BuySubRewardArgs, BuySubRewardOptimisticContext>({
    mutationFn: async ({ rewardId, cost, currentSupply, profileId, currentPoints }) => {
      if (currentSupply <= 0) {
        throw new Error("Reward is out of stock.");
      }
      if (currentPoints < cost) {
        throw new Error("Not enough points.");
      }

      const newSupply = currentSupply - 1; 
      const newPoints = currentPoints - cost;

      const { error: supplyError } = await supabase
        .from('rewards')
        .update({ supply: newSupply })
        .eq('id', rewardId);

      if (supplyError) throw supplyError;

      const { error: pointsError } = await supabase
        .from('profiles')
        .update({ points: newPoints, updated_at: new Date().toISOString() })
        .eq('id', profileId);

      if (pointsError) {
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
      await queryClient.cancelQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE]});

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
        points: (old?.points ?? variables.currentPoints) - variables.cost,
        dom_points: old?.dom_points ?? 0, // Dom points unchanged
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
      toast({ title: "Reward Purchased!", description: `You bought ${data.title}.` });
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: userProfilePointsKey(variables.profileId) });
      queryClient.invalidateQueries({ queryKey: [PROFILE_POINTS_QUERY_KEY_BASE] });
    },
  });
};
