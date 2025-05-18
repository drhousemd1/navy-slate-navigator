
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';

interface RedeemRewardVars { 
  rewardId: string; 
  currentSupply: number; 
  profileId: string 
}

interface RedeemRewardResponse { 
  rewardId: string; 
  newSupply: number 
}

export const useRedeemSubReward = () => {
  const queryClient = useQueryClient();

  return useMutation<RedeemRewardResponse, Error, RedeemRewardVars>({
    mutationFn: async ({ rewardId, currentSupply, profileId }) => {
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

      return { rewardId, newSupply };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast({
        title: "Reward Redeemed",
        description: "Reward redeemed successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to redeem reward: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useRedeemDomReward = () => {
  const queryClient = useQueryClient();

  return useMutation<RedeemRewardResponse, Error, RedeemRewardVars>({
    mutationFn: async ({ rewardId, currentSupply, profileId }) => {
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

      return { rewardId, newSupply };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast({
        title: "Reward Redeemed",
        description: "Reward redeemed successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to redeem reward: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
