import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/data/rewards/types';

interface BuySubRewardArgs {
  rewardId: string;
  cost: number;
  currentSupply: number; 
  profileId: string;
  currentPoints: number;
}

interface BuySubRewardOptimisticContext {
  previousRewards?: Reward[];
  previousPoints?: number;
}

export const useBuySubReward = () => {
  const queryClient = useQueryClient();

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
        .update({ points: newPoints })
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
      await queryClient.cancelQueries({ queryKey: ['rewards'] });
      await queryClient.cancelQueries({ queryKey: ['rewardsPoints'] });

      const previousRewards = queryClient.getQueryData<Reward[]>(['rewards']);
      const previousPoints = queryClient.getQueryData<number>(['rewardsPoints']);
      
      queryClient.setQueryData<Reward[]>(['rewards'], (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply - 1 } 
            : reward
        )
      );
      queryClient.setQueryData<number>(['rewardsPoints'], (oldPoints = 0) =>
        (oldPoints || 0) - variables.cost
      );

      return { previousRewards, previousPoints };
    },
    onError: (err, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(['rewards'], context.previousRewards);
      }
      if (context?.previousPoints !== undefined) {
        queryClient.setQueryData<number>(['rewardsPoints'], context.previousPoints);
      }
      toast({ title: "Purchase Failed", description: err.message, variant: "destructive" });
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<Reward[]>(['rewards'], (oldRewards = []) => {
        return oldRewards.map(r => r.id === data.id ? data : r);
      });
      queryClient.invalidateQueries({ queryKey: ['rewardsPoints'] });
      toast({ title: "Reward Purchased!", description: `You bought ${data.title}.` });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['rewardsPoints'] });
    },
  });
};
