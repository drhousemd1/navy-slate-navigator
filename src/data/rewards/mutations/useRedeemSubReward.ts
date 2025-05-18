import { useQueryClient } from '@tanstack/react-query';
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

export const useRedeemSubReward = () => {
  const queryClient = useQueryClient();
  const REWARDS_QUERY_KEY = ['rewards'];

  return {
    mutateAsync: async ({ rewardId, currentSupply, profileId }: RedeemSubRewardVariables) => {
      // Cancel any ongoing queries that might interfere
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });

      // Store previous state for potential rollback
      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);

      try {
        // Optimistically update the reward supply in the cache
        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldRewards = []) =>
          oldRewards.map(r =>
            r.id === rewardId ? { ...r, supply: Math.max(0, r.supply - 1) } : r
          )
        );

        // Get current date information for record keeping
        const today = new Date();
        const dayOfWeek = today.getDay();
        const weekNumber = getISOWeekString(today);

        // Perform the actual API calls
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

        toast({
          title: "Reward Redeemed",
          description: "Your reward has been successfully redeemed!",
        });

        return { success: true, rewardId };
      } catch (error) {
        // Roll back optimistic update on error
        if (previousRewards) {
          queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, previousRewards);
        }

        console.error('Error redeeming sub reward:', error);
        toast({
          title: "Redemption Failed",
          description: "There was a problem redeeming this reward. Please try again.",
          variant: "destructive",
        });
        throw error;
      } finally {
        // Always refetch to ensure consistency
        queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ['rewards', rewardId] }); // Specific reward
      }
    }
  };
};

// Helper function to generate ISO week string (YYYY-Wxx format)
function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;               // 1–7 (Mon–Sun)
  d.setUTCDate(d.getUTCDate() + 4 - day);       // to nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
}
