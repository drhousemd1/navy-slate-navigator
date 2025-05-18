
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Reward } from '../types';
import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager';

interface RedeemSubRewardVariables {
  rewardId: string;
  currentSupply: number;
  profileId: string; // profileId is present but not used in mutationFn
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
      await queryClient.cancelQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS });
      const previousRewards = queryClient.getQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS);

      queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, (old = []) =>
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
        queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, context.previousRewards);
      }
      toast({ 
        title: "Failed to Use Reward", 
        description: err.message, 
        variant: "destructive" 
      });
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, (oldRewards = []) => {
        return oldRewards.map(r => r.id === data.id ? data : r);
      });
      toast({ title: "Reward Used!", description: `You used ${data.title}.` });
    },
    onSettled: (_data, _error, variables) => { // Added variables to onSettled
      queryClient.invalidateQueries({ queryKey: [CRITICAL_QUERY_KEYS.REWARDS, variables.rewardId] }); // Invalidate specific reward
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS }); // Invalidate general list
    },
  });
};
