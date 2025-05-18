
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Reward } from '@/data/RewardsDataHandler';

export interface RedeemSubRewardVariables {
  rewardId: string;
  currentSupply: number;
  profileId: string;
}

interface RedeemRewardOptimisticContext {
  previousRewards?: Reward[];
}

// Helper function to generate ISO week string (YYYY-Wxx format)
// Kept in this file for now, consider moving to a util.
function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // 1–7 (Mon–Sun)
  d.setUTCDate(d.getUTCDate() + 4 - day); // to nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
}

export const useRedeemSubReward = () => {
  const queryClient = useQueryClient();
  const REWARDS_QUERY_KEY = ['rewards'];

  return useMutation<
    { success: boolean; rewardId: string },
    Error,
    RedeemSubRewardVariables,
    RedeemRewardOptimisticContext
  >({
    mutationFn: async ({ rewardId, currentSupply, profileId }) => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const weekNumber = getISOWeekString(today);

      const { error: supplyError } = await supabase
        .from('rewards')
        .update({ supply: Math.max(0, currentSupply - 1), updated_at: new Date().toISOString() })
        .eq('id', rewardId);

      if (supplyError) throw supplyError;

      const { error: usageError } = await supabase
        .from('reward_usage')
        .insert([{
          reward_id: rewardId,
          profile_id: profileId,
          used: false,
          day_of_week: dayOfWeek,
          week_number: weekNumber
        }]);

      if (usageError) throw usageError;

      return { success: true, rewardId };
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldRewards = []) =>
        oldRewards.map(r =>
          r.id === variables.rewardId ? { ...r, supply: Math.max(0, r.supply - 1) } : r
        )
      );
      return { previousRewards };
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Reward Redeemed",
        description: "Your reward has been successfully redeemed!",
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, context.previousRewards);
      }
      console.error('Error redeeming sub reward:', error);
      toast({
        title: "Redemption Failed",
        description: "There was a problem redeeming this reward. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      if (variables?.rewardId) {
        queryClient.invalidateQueries({ queryKey: ['rewards', variables.rewardId] });
      }
    },
  });
};
