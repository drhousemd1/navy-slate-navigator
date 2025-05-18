
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface RedeemDomRewardVariables {
  rewardId: string;
}

export const useRedeemDomReward = () => {
  const queryClient = useQueryClient();

  return {
    mutateAsync: async ({ rewardId }: RedeemDomRewardVariables) => {
      try {
        // Mark the dom reward as redeemed in the database
        // This is just a placeholder - you might want to update a "redeemed" field or create a redemption record
        const { error } = await supabase
          .from('reward_usage')
          .update({ used: true })
          .eq('reward_id', rewardId)
          .is('used', null);

        if (error) throw error;

        toast({
          title: "Dom Reward Redeemed",
          description: "Your dom reward has been successfully redeemed!",
        });

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['rewards'] });

        return { success: true };
      } catch (error) {
        console.error('Error redeeming dom reward:', error);
        toast({
          title: "Redemption Failed",
          description: "There was a problem redeeming this dom reward. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    }
  };
};
