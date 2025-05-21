
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Reward } from '../types';

const REWARDS_QUERY_KEY = ['rewards'];

interface RedeemSubRewardVariables {
  rewardId: string;
  currentSupply: number;
  profileId: string; 
}

interface RedeemSubRewardOptimisticContext {
  previousRewards?: Reward[];
}

export const useRedeemSubReward = () => {
  const queryClient = useQueryClient();

  return useMutation<Reward, Error, RedeemSubRewardVariables, RedeemSubRewardOptimisticContext>({
    mutationFn: async ({ rewardId, currentSupply }) => {
      if (currentSupply <= 0) {
        throw new Error("Reward is out of stock, cannot use.");
      }
      const newSupply = currentSupply - 1;

      const { error: supplyError } = await supabase
        .from('rewards')
        .update({ supply: newSupply, updated_at: new Date().toISOString() })
        .eq('id', rewardId);

      if (supplyError) throw supplyError;

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
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);

      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) =>
        old.map(reward =>
          reward.id === variables.rewardId
            ? { ...reward, supply: reward.supply - 1 }
            : reward
        )
      );
      return { previousRewards };
    },
    onError: (err, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards);
      }
      toast({ 
        title: "Failed to Use Reward", 
        description: err.message, 
        variant: "destructive" 
      });
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldRewards = []) => {
        return oldRewards.map(r => r.id === data.id ? data : r);
      });
      toast({ title: "Reward Used!", description: `You used ${data.title}.` });
    },
    onSettled: (_data, _error, variables) => { 
      queryClient.invalidateQueries({ queryKey: [...REWARDS_QUERY_KEY, variables.rewardId] });
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
    },
  });
};
