import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  previousPoints?: any; // Consider defining a more specific type for points data
}

// Define the expected return type of the mutationFn
interface BuyDomRewardSuccessData {
  success: boolean;
  newDomPoints: number;
  newSupply: number;
  updatedReward: Reward;
  rewardTitle: string;
}

export const useBuyDomReward = () => {
  const queryClient = useQueryClient();
  const REWARDS_QUERY_KEY = ['rewards'];
  const PROFILE_POINTS_QUERY_KEY = ['profile_points'];

  return useMutation<
    BuyDomRewardSuccessData,
    Error,
    BuyDomRewardVariables,
    BuyDomRewardOptimisticContext
  >({
    mutationFn: async ({
      rewardId,
      cost,
      currentSupply,
      profileId,
      currentDomPoints
    }) => {
      // Validation checks remain at the start of mutationFn
      if (currentDomPoints < cost) {
        // This toast will be shown before onError if validation fails here
        // For consistency, onError should handle all failure toasts.
        // To achieve that, this validation could throw an error that onError then catches and toasts.
        // For now, keeping original behavior where validation toast is separate.
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
      if (!rewardData) throw new Error("Reward data not found after update.");

      // Record reward usage - Assuming buying a reward also means it's 'used' in some context
      // The original useBuyDomReward inserted into reward_usage with used: true
      const today = new Date();
      // The original code used today.toISOString().slice(0, 10) which is YYYY-MM-DD.
      // The redeem hooks use getISOWeekString (YYYY-Www). For consistency, it might be better to align these.
      // For now, I'll keep the original logic for `useBuyDomReward`.
      const weekIdentifier = today.toISOString().slice(0, 10); 
      const dayOfWeek = today.getDay();

      const { error: usageError } = await supabase
        .from('reward_usage')
        .insert({
          reward_id: rewardId,
          profile_id: profileId,
          week_number: weekIdentifier, // Using YYYY-MM-DD as per original
          day_of_week: dayOfWeek,
          used: true // Original had this as true
        });
      if (usageError) throw usageError;

      return {
        success: true,
        newDomPoints: currentDomPoints - cost,
        newSupply: currentSupply - 1,
        updatedReward: rewardData as Reward, // Cast as Reward
        rewardTitle: rewardData?.title || "Dom Reward"
      };
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: REWARDS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });

      const previousRewards = queryClient.getQueryData<Reward[]>(REWARDS_QUERY_KEY);
      const previousPoints = queryClient.getQueryData(PROFILE_POINTS_QUERY_KEY);

      // Optimistic update for points
      queryClient.setQueryData(PROFILE_POINTS_QUERY_KEY, (old: any) => ({
        ...old,
        dom_points: old?.dom_points ? old.dom_points - variables.cost : variables.currentDomPoints - variables.cost,
      }));

      // Optimistic update for rewards
      queryClient.setQueryData<Reward[]>(REWARDS_QUERY_KEY, (oldRewards = []) =>
        oldRewards.map(reward =>
          reward.id === variables.rewardId ? { ...reward, supply: reward.supply - 1 } : reward
        )
      );

      return { previousRewards, previousPoints };
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Dom Reward Purchased",
        description: `You have successfully purchased ${data.rewardTitle}!`,
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData(REWARDS_QUERY_KEY, context.previousRewards);
      }
      if (context?.previousPoints) {
        queryClient.setQueryData(PROFILE_POINTS_QUERY_KEY, context.previousPoints);
      }

      console.error('Error buying dom reward:', error);
      // Avoid double toasting if validation error already toasted.
      // The mutationFn throws specific errors for validation which are caught here.
      // The original code had toasts inside the validation block.
      // If error.message is "Not enough dom points" or "Reward out of stock", it was already toasted.
      if (error.message !== "Not enough dom points" && error.message !== "Reward out of stock") {
        toast({
          title: "Failed to Purchase",
          description: "There was a problem purchasing this reward. Please try again.",
          variant: "destructive",
        });
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PROFILE_POINTS_QUERY_KEY });
      if (variables?.rewardId) {
        queryClient.invalidateQueries({ queryKey: ['rewards', variables.rewardId] });
      }
    },
  });
};
