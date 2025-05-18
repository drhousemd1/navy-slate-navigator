
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Reward } from '../types'; // Corrected path
import { toast } from '@/hooks/use-toast';
import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager'; // Assuming this is needed


export interface RedeemDomRewardVariables {
  rewardId: string;
  currentSupply: number; // Reward's total supply before redeeming
  profileId: string;
}

interface RedeemRewardOptimisticContext {
  previousRewards?: Reward[];
}

// Helper function to generate ISO week string (YYYY-Wxx format)
function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; 
  d.setUTCDate(d.getUTCDate() + 4 - day); 
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
}

export const useRedeemDomReward = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; rewardId: string; updatedReward: Reward }, // Added updatedReward
    Error,
    RedeemDomRewardVariables,
    RedeemRewardOptimisticContext
  >({
    mutationFn: async ({ rewardId, currentSupply, profileId }) => {
      if (currentSupply <= 0) {
        throw new Error("Reward is out of stock or you don't have it to use.");
      }
      const newSupply = Math.max(0, currentSupply - 1);

      const { data: updatedRewardData, error: supplyError } = await supabase
        .from('rewards')
        .update({ supply: newSupply, updated_at: new Date().toISOString() })
        .eq('id', rewardId)
        .select()
        .single();

      if (supplyError) throw supplyError;
      if (!updatedRewardData) throw new Error("Failed to update reward supply on redeem.");


      const today = new Date();
      const dayOfWeek = today.getDay();
      const weekNumber = getISOWeekString(today);

      const { error: usageError } = await supabase
        .from('reward_usage')
        .insert([{
          reward_id: rewardId,
          profile_id: profileId,
          used: true, // Typically redeeming means it's used
          day_of_week: dayOfWeek,
          week_number: weekNumber
        }]);

      if (usageError) {
        // Attempt to revert supply
        await supabase.from('rewards').update({ supply: currentSupply }).eq('id', rewardId);
        throw usageError;
      }

      return { success: true, rewardId, updatedReward: updatedRewardData as Reward };
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS });
      const previousRewards = queryClient.getQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS);
      queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, (oldRewards = []) =>
        oldRewards.map(r =>
          r.id === variables.rewardId ? { ...r, supply: Math.max(0, r.supply - 1) } : r
        )
      );
      return { previousRewards };
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Dom Reward Redeemed",
        description: `Your dom reward "${data.updatedReward.title}" has been successfully redeemed!`,
      });
       queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS });
    },
    onError: (error, variables, context) => {
      if (context?.previousRewards) {
        queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, context.previousRewards);
      }
      console.error('Error redeeming dom reward:', error);
      toast({
        title: "Redemption Failed",
        description: error.message || "There was a problem redeeming this dom reward.",
        variant: "destructive",
      });
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS });
      if (variables?.rewardId) {
         queryClient.invalidateQueries({ queryKey: [CRITICAL_QUERY_KEYS.REWARDS, variables.rewardId] });
      }
    },
  });
};
```
