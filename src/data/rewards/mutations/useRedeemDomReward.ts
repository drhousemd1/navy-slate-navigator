import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Reward } from '../types'; 
// Removed: import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager';

const REWARDS_QUERY_KEY = ['rewards'];

interface RedeemDomRewardVariables {
  rewardId: string;
  currentSupply: number;
  profileId: string;
}

interface RedeemDomRewardOptimisticContext {
  previousRewards?: Reward[];
}

export const useRedeemDomReward = () => {
  const queryClient = useQueryClient();

  return useMutation<Reward, Error, RedeemDomRewardVariables, RedeemDomRewardOptimisticContext>({
    mutationFn: async ({ rewardId, currentSupply }) => {
      if (currentSupply <= 0) {
        throw new Error("Reward is out of stock, cannot use.");
      }
      const newSupply = currentSupply - 1;

      const { error: supplyError } = await supabase
        .from('rewards')
        .update({ supply: newSupply })
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
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY }); // Replaced CRITICAL_QUERY_KEYS.REWARDS
      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY); // Replaced CRITICAL_QUERY_KEYS.REWARDS

      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) => // Replaced CRITICAL_QUERY_KEYS.REWARDS
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
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards); // Replaced CRITICAL_QUERY_KEYS.REWARDS
      }
      toast({ 
        title: "Failed to Use Reward", 
        description: err.message, 
        variant: "destructive" 
      });
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldRewards = []) => { // Replaced CRITICAL_QUERY_KEYS.REWARDS
        return oldRewards.map(r => r.id === data.id ? data : r);
      });
      toast({ title: "Reward Used!", description: `You used ${data.title}.` });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY }); // Replaced CRITICAL_QUERY_KEYS.REWARDS
    },
  });
};
