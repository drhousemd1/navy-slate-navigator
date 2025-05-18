
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '@/data/RewardsDataHandler';
import { toast } from '@/hooks/use-toast';

export interface BuySubRewardVariables {
  rewardId: string;
  cost: number;
  currentSupply: number;
  profileId: string;
  currentPoints: number;
}

export const useBuySubReward = () => {
  const queryClient = useQueryClient();

  return {
    mutateAsync: async ({
      rewardId,
      cost,
      currentSupply,
      profileId,
      currentPoints
    }: BuySubRewardVariables) => {
      // Check if user has enough points
      if (currentPoints < cost) {
        toast({
          title: "Not enough points",
          description: `You need ${cost - currentPoints} more points to buy this reward.`,
          variant: "destructive",
        });
        throw new Error("Not enough points");
      }

      // Check if reward has enough supply
      if (currentSupply <= 0) {
        toast({
          title: "Out of stock",
          description: "This reward is currently out of stock.",
          variant: "destructive",
        });
        throw new Error("Reward out of stock");
      }

      // Optimistically update the cache
      queryClient.setQueryData(['profile_points'], (old: any) => ({
        ...old,
        points: old?.points ? old.points - cost : currentPoints - cost,
      }));

      queryClient.setQueryData(['rewards'], (old: Reward[] | undefined) => {
        if (!old) return undefined;
        return old.map(reward => {
          if (reward.id === rewardId) {
            return { ...reward, supply: reward.supply - 1 };
          }
          return reward;
        });
      });

      try {
        // Update points in the database
        const { error: pointsError } = await supabase
          .from('profiles')
          .update({ points: currentPoints - cost })
          .eq('id', profileId);

        if (pointsError) throw pointsError;

        // Update reward supply in the database
        const { error: rewardError } = await supabase
          .from('rewards')
          .update({ supply: currentSupply - 1 })
          .eq('id', rewardId);

        if (rewardError) throw rewardError;

        // Record reward usage
        const weekNumber = new Date().toISOString().slice(0, 10); // current date as week identifier
        const dayOfWeek = new Date().getDay();

        const { error: usageError } = await supabase
          .from('reward_usage')
          .insert({
            reward_id: rewardId,
            week_number: weekNumber,
            day_of_week: dayOfWeek,
            used: true
          });

        if (usageError) throw usageError;

        toast({
          title: "Reward Purchased",
          description: "You have successfully purchased this reward!",
        });

        return {
          success: true,
          newPoints: currentPoints - cost,
          newSupply: currentSupply - 1
        };
      } catch (error) {
        // Revert optimistic updates on error
        queryClient.setQueryData(['profile_points'], (old: any) => ({
          ...old,
          points: currentPoints,
        }));

        queryClient.setQueryData(['rewards'], (old: Reward[] | undefined) => {
          if (!old) return undefined;
          return old.map(reward => {
            if (reward.id === rewardId) {
              return { ...reward, supply: currentSupply };
            }
            return reward;
          });
        });

        console.error('Error buying sub reward:', error);
        toast({
          title: "Failed to Purchase",
          description: "There was a problem purchasing this reward. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    }
  };
};
