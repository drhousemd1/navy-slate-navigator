
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/data/RewardsDataHandler';
import { toast } from '@/hooks/use-toast';

export interface BuyDomRewardVariables {
  rewardId: string;
  cost: number;
  currentSupply: number;
  profileId: string;
  currentDomPoints: number;
}

interface BuyDomRewardOptimisticContext {
  previousRewards?: Reward[];
  previousPoints?: any;
}

export const useBuyDomReward = () => {
  const queryClient = useQueryClient();
  const REWARDS_QUERY_KEY = ['rewards'];
  const PROFILE_POINTS_QUERY_KEY = ['profile_points'];

  return {
    mutateAsync: async ({
      rewardId,
      cost,
      currentSupply,
      profileId,
      currentDomPoints
    }: BuyDomRewardVariables) => {
      // Validation checks
      if (currentDomPoints < cost) {
        toast({
          title: "Not enough dom points",
          description: `You need ${cost - currentDomPoints} more dom points to buy this reward.`,
          variant: "destructive",
        });
        throw new Error("Not enough dom points");
      }

      if (currentSupply <= 0) {
        toast({
          title: "Out of stock",
          description: "This reward is currently out of stock.",
          variant: "destructive",
        });
        throw new Error("Reward out of stock");
      }
      
      // Cancel any in-flight queries
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
      
      // Save previous state for rollback
      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);
      const previousPoints = queryClient.getQueryData(PROFILE_POINTS_QUERY_KEY);
      
      try {
        // Optimistic updates to the cache
        queryClient.setQueryData(PROFILE_POINTS_QUERY_KEY, (old: any) => ({
          ...old,
          dom_points: old?.dom_points ? old.dom_points - cost : currentDomPoints - cost,
        }));

        queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (old = []) => {
          return old.map(reward => {
            if (reward.id === rewardId) {
              return { ...reward, supply: reward.supply - 1 };
            }
            return reward;
          });
        });

        // Update dom points in the database
        const { error: pointsError } = await supabase
          .from('profiles')
          .update({ dom_points: currentDomPoints - cost, updated_at: new Date().toISOString() })
          .eq('id', profileId);

        if (pointsError) throw pointsError;

        // Update reward supply in the database
        const { data: rewardData, error: rewardError } = await supabase
          .from('rewards')
          .update({ supply: currentSupply - 1, updated_at: new Date().toISOString() })
          .eq('id', rewardId)
          .select()
          .single();

        if (rewardError) throw rewardError;

        // Record reward usage
        const today = new Date();
        const weekNumber = today.toISOString().slice(0, 10); // current date as week identifier
        const dayOfWeek = today.getDay();

        const { error: usageError } = await supabase
          .from('reward_usage')
          .insert({
            reward_id: rewardId,
            profile_id: profileId,
            week_number: weekNumber,
            day_of_week: dayOfWeek,
            used: true
          });

        if (usageError) throw usageError;

        toast({
          title: "Dom Reward Purchased",
          description: "You have successfully purchased this dom reward!",
        });

        return {
          success: true,
          newDomPoints: currentDomPoints - cost,
          newSupply: currentSupply - 1,
          updatedReward: rewardData as Reward,
          rewardTitle: rewardData?.title || "Dom Reward"
        };
      } catch (error) {
        // Revert optimistic updates on error
        if (previousRewards) {
          queryClient.setQueryData(REWARDS_QUERY_KEY, previousRewards);
        }
        
        if (previousPoints) {
          queryClient.setQueryData(PROFILE_POINTS_QUERY_KEY, previousPoints);
        }

        console.error('Error buying dom reward:', error);
        toast({
          title: "Failed to Purchase",
          description: "There was a problem purchasing this reward. Please try again.",
          variant: "destructive",
        });
        throw error;
      } finally {
        // Always invalidate queries to ensure data consistency
        queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ['rewards', rewardId] });
      }
    }
  };
};
