
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from '@/hooks/use-toast';

interface BuyDomRewardVars { 
  rewardId: string; 
  cost: number; 
  currentSupply: number; 
  profileId: string; 
  currentDomPoints: number 
}

interface BuyDomRewardResponse { 
  rewardId: string; 
  newSupply: number; 
  newPoints: number 
}

export const useBuyDomReward = () => {
  const queryClient = useQueryClient();

  return useMutation<BuyDomRewardResponse, Error, BuyDomRewardVars>({
    mutationFn: async ({ rewardId, cost, currentSupply, profileId, currentDomPoints }) => {
      if (currentDomPoints < cost) {
        toast({
          title: "Not enough points",
          description: "You do not have enough points to purchase this reward.",
          variant: "destructive",
        });
        throw new Error("Not enough points");
      }

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

      const newPoints = currentDomPoints - cost;
      const { error: profileError } = await supabase.from('profiles').update({ dom_points: newPoints }).eq('id', profileId);
      if (profileError) throw profileError;

      return { rewardId, newSupply, newPoints };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rewards'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: "Reward Purchased",
        description: "Reward purchased successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to purchase reward: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
