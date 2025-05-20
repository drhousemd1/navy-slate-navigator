import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { Reward } from "@/data/rewards/types";
import { saveRewardsToDB, savePointsToDB, saveDomPointsToDB } from "../indexedDB/useIndexedDB";
import { toast } from "@/hooks/use-toast";

interface BuyRewardParams {
  rewardId: string;
  cost: number;
  isDomReward?: boolean;
  currentSupply: number; 
  // profileId: string; 
  // currentPoints: number; 
}

interface BuyRewardResult {
    updatedReward: Reward;
    newPointsBalance: number;
}

const buyReward = async ({ rewardId, cost, isDomReward = false, currentSupply }: BuyRewardParams): Promise<BuyRewardResult> => {
  const queryClient = useQueryClient(); 
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
    await supabase.from('rewards').update({ supply: currentSupply, updated_at: new Date().toISOString() }).eq('id', rewardId);
    throw pointsError;
  }
  
  const pointsQueryKeyString = isDomReward ? 'rewardsDomPoints' : 'rewardsPoints';
  queryClient.setQueryData([pointsQueryKeyString], newPointsBalance); // Replaced CRITICAL_QUERY_KEYS
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
      queryClient.setQueryData<Reward[]>(['rewards'], (oldRewards = []) => { // Replaced CRITICAL_QUERY_KEYS.REWARDS
        const updatedRewards = oldRewards.map(reward => 
          reward.id === variables.rewardId ? data.updatedReward : reward
        );
        saveRewardsToDB(updatedRewards); 
        return updatedRewards;
      });

      queryClient.invalidateQueries({ queryKey: ['rewards'] }); // Replaced CRITICAL_QUERY_KEYS.REWARDS
      const pointsQueryKeyString = variables.isDomReward ? 'rewardsDomPoints' : 'rewardsPoints';
      queryClient.invalidateQueries({ queryKey: [pointsQueryKeyString] }); // Replaced CRITICAL_QUERY_KEYS

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
      queryClient.invalidateQueries({ queryKey: ['rewards'] }); // Replaced CRITICAL_QUERY_KEYS.REWARDS
      queryClient.invalidateQueries({ queryKey: ['rewardsPoints'] }); // Replaced CRITICAL_QUERY_KEYS.REWARDS_POINTS
      queryClient.invalidateQueries({ queryKey: ['rewardsDomPoints'] }); // Replaced CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS
    }
  });
}
