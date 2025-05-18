
import { useMutation, useQueryClient } from "@tanstack/react-query";
// queryClient import needs to be corrected if it's not from a central export.
// For now, assuming a central queryClient. If not, this will need adjustment.
// import { queryClient } from "../queryClient"; 
import { supabase } from '@/integrations/supabase/client';
import { Reward } from "@/data/rewards/types";
import { saveRewardsToDB, savePointsToDB, saveDomPointsToDB } from "../indexedDB/useIndexedDB";
import { CRITICAL_QUERY_KEYS } from "@/hooks/useSyncManager";
import { toast } from "@/hooks/use-toast";

interface BuyRewardParams {
  rewardId: string;
  cost: number;
  isDomReward?: boolean;
  currentSupply: number; // Added: needed for consistent supply handling
  // profileId: string; // Added: For updating specific profile
  // currentPoints: number; // Added: For optimistic update and validation
}

// It's good practice for the mutation function to return meaningful data
interface BuyRewardResult {
    updatedReward: Reward;
    newPointsBalance: number;
    // message?: string; // Optional success message
}

const buyReward = async ({ rewardId, cost, isDomReward = false, currentSupply }: BuyRewardParams): Promise<BuyRewardResult> => {
  const queryClient = useQueryClient(); // Get queryClient instance from hook
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) {
    throw new Error("User not authenticated");
  }
  const profileId = userData.user.id;

  const { data: reward, error: fetchError } = await supabase
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .single();
    
  if (fetchError) throw fetchError;
  if (!reward) throw new Error("Reward not found to buy.");
  
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('points, dom_points')
    .eq('id', profileId)
    .single();
    
  if (profileError) throw profileError;
  if (!profileData) throw new Error("Profile not found.");

  const userCurrentPoints = isDomReward ? (profileData.dom_points || 0) : (profileData.points || 0);
  if (userCurrentPoints < cost) {
    throw new Error(`Not enough ${isDomReward ? 'dom ' : ''}points to buy this reward. Current: ${userCurrentPoints}, Cost: ${cost}`);
  }
  
  // Supply check (assuming -1 means infinite, otherwise positive supply required)
  if (reward.supply !== -1 && currentSupply <= 0) {
      throw new Error("Reward is out of stock.");
  }

  const newRewardSupply = reward.supply === -1 ? -1 : currentSupply - 1;

  const { data: updatedRewardData, error: updateError } = await supabase
    .from('rewards')
    .update({ 
      supply: newRewardSupply,
      updated_at: new Date().toISOString()
    })
    .eq('id', rewardId)
    .select()
    .single();
    
  if (updateError) throw updateError;
  if (!updatedRewardData) throw new Error("Failed to update reward after purchase.");
  
  const newPointsBalance = userCurrentPoints - cost;
  const updateProfilePayload = isDomReward ? { dom_points: newPointsBalance } : { points: newPointsBalance };

  const { error: pointsError } = await supabase
    .from('profiles')
    .update({ ...updateProfilePayload, updated_at: new Date().toISOString() })
    .eq('id', profileId);
    
  if (pointsError) {
    // Revert reward supply if points update failed
    await supabase.from('rewards').update({ supply: currentSupply, updated_at: new Date().toISOString() }).eq('id', rewardId);
    throw pointsError;
  }
  
  // Update local cache optimistically (or via invalidation below)
  // For direct cache update:
  const pointsQueryKey = isDomReward ? CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS : CRITICAL_QUERY_KEYS.REWARDS_POINTS;
  queryClient.setQueryData(pointsQueryKey, newPointsBalance);
  if (isDomReward) {
    await saveDomPointsToDB(newPointsBalance);
  } else {
    await savePointsToDB(newPointsBalance);
  }
  
  return { updatedReward: updatedRewardData as Reward, newPointsBalance };
};

export function useBuyReward() {
  const queryClient = useQueryClient();
  return useMutation<BuyRewardResult, Error, BuyRewardParams>({
    mutationFn: buyReward,
    onSuccess: (data, variables) => {
      // Optimistically update rewards list in cache
      queryClient.setQueryData<Reward[]>(CRITICAL_QUERY_KEYS.REWARDS, (oldRewards = []) => {
        const updatedRewards = oldRewards.map(reward => 
          reward.id === variables.rewardId ? data.updatedReward : reward
        );
        saveRewardsToDB(updatedRewards); // Persist to IndexedDB
        return updatedRewards;
      });

      // Invalidate queries to ensure data consistency from server
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS });
      const pointsQueryKey = variables.isDomReward ? CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS : CRITICAL_QUERY_KEYS.REWARDS_POINTS;
      queryClient.invalidateQueries({ queryKey: pointsQueryKey });

      toast({
        title: "Reward Purchased!",
        description: `You bought ${data.updatedReward.title} for ${variables.cost} ${variables.isDomReward ? "DOM " : ""}points.`
      });
    },
    onError: (error) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Could not purchase reward.",
        variant: "destructive",
      });
       // Optionally, invalidate queries here too to refetch fresh state on error
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS });
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_POINTS });
      queryClient.invalidateQueries({ queryKey: CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS });
    }
  });
}
