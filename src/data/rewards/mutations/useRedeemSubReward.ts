
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toastManager } from '@/lib/toastManager';
import { Reward } from '../types';
import { useUserIds } from '@/contexts/UserIdsContext';
import { SUB_REWARD_TYPES_COUNT_QUERY_KEY } from '../queries/useSubRewardTypesCountQuery';

const REWARDS_QUERY_KEY = ['rewards'];

interface RedeemSubRewardVariables {
  rewardId: string;
  currentSupply: number;
  profileId: string; 
}

interface RedeemSubRewardOptimisticContext {
  previousRewards?: Reward[];
}

const recordRewardUsage = async (rewardId: string, userId: string) => {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  const weekNumber = `${startOfWeek.getFullYear()}-W${Math.ceil(startOfWeek.getDate() / 7)}`;

  await supabase
    .from('reward_usage')
    .insert({
      reward_id: rewardId,
      day_of_week: dayOfWeek,
      week_number: weekNumber,
      used: true,
      user_id: userId
    });
};

export const useRedeemSubReward = () => {
  const queryClient = useQueryClient();
  const { subUserId } = useUserIds();

  return useMutation<Reward, Error, RedeemSubRewardVariables, RedeemSubRewardOptimisticContext>({
    mutationFn: async ({ rewardId, currentSupply }) => {
      if (!subUserId) {
        throw new Error("User not authenticated");
      }

      if (currentSupply <= 0 && currentSupply !== -1) {
        throw new Error("Reward is out of stock, cannot use.");
      }
      
      const newSupply = currentSupply === -1 ? -1 : currentSupply - 1;

      const { error: supplyError } = await supabase
        .from('rewards')
        .update({ supply: newSupply, updated_at: new Date().toISOString() })
        .eq('id', rewardId);

      if (supplyError) throw supplyError;

      await recordRewardUsage(rewardId, subUserId);

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
            ? { ...reward, supply: reward.supply === -1 ? -1 : reward.supply - 1 }
            : reward
        )
      );
      return { previousRewards };
    },
    onError: (err, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards);
      }
      toastManager.error("Failed to Use Reward", err.message);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldRewards = []) => {
        return oldRewards.map(r => r.id === data.id ? data : r);
      });
      
      queryClient.invalidateQueries({ queryKey: ['reward-usage', variables.rewardId] });
      
      toastManager.success("Reward Used!", `You used ${data.title}.`);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['reward-usage'] });
      queryClient.invalidateQueries({ queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY] });
    },
  });
};
