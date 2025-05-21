
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';

import { USER_POINTS_QUERY_KEY_PREFIX } from '@/data/points/useUserPointsQuery';
// For reward supply changes potentially affecting counts:
import { SUB_REWARD_TYPES_COUNT_QUERY_KEY } from '@/data/rewards/queries/useSubRewardTypesCountQuery';
import { DOM_REWARD_TYPES_COUNT_QUERY_KEY } from '@/data/rewards/queries/useDomRewardTypesCountQuery';

interface BuySubRewardVars { 
  rewardId: string; 
  cost: number; 
  currentSupply: number; 
  profileId: string; // This is the subUserId
  currentPoints: number 
}

interface BuySubRewardResponse { 
  rewardId: string; 
  newSupply: number; 
  newPoints: number 
}

export const useBuySubReward = () => {
  const queryClient = useQueryClient();

  return useMutation<BuySubRewardResponse, Error, BuySubRewardVars>({
    mutationFn: async ({ rewardId, cost, currentSupply, profileId, currentPoints }) => {
      if (currentPoints < cost) {
        toast({
          title: "Not enough points",
          description: "You do not have enough points to purchase this reward.",
          variant: "destructive",
        });
        throw new Error("Not enough points");
      }

      // Only consider out of stock if supply is exactly 0 (unlimited is -1)
      if (currentSupply === 0) { 
        toast({
          title: "Out of stock",
          description: "This reward is currently out of stock.",
          variant: "destructive",
        });
        throw new Error("Out of stock");
      }

      const newSupply = currentSupply === -1 ? currentSupply : currentSupply - 1;

      const { error } = await supabase.from('rewards').update({ supply: newSupply }).eq('id', rewardId);
      if (error) throw error;

      const newPoints = currentPoints - cost;
      const { error: profileError } = await supabase.from('profiles').update({ points: newPoints }).eq('id', profileId);
      if (profileError) {
        // Attempt to revert supply update on profile points update failure
        await supabase.from('rewards').update({ supply: currentSupply }).eq('id', rewardId);
        throw profileError;
      }

      return { rewardId, newSupply, newPoints };
    },
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['rewards'] });
      await queryClient.invalidateQueries({ queryKey: [USER_POINTS_QUERY_KEY_PREFIX, variables.profileId] });
      // Invalidate counts as supply changes
      await queryClient.invalidateQueries({ queryKey: [SUB_REWARD_TYPES_COUNT_QUERY_KEY] });
      await queryClient.invalidateQueries({ queryKey: [DOM_REWARD_TYPES_COUNT_QUERY_KEY] });
      toast({
        title: "Reward Purchased",
        description: "Reward purchased successfully!",
      });
    },
    onError: (error: Error) => {
      // Avoid redundant toasts for known, pre-toasted errors
      if (error.message !== "Not enough points" && error.message !== "Out of stock") {
        toast({
          title: "Purchase Error",
          description: error.message || "Failed to purchase reward.",
          variant: "destructive",
        });
      }
    },
  });
};
