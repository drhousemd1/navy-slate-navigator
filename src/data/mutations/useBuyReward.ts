
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useMutation } from "@tanstack/react-query";
import { queryClient } from "../queryClient";
import { supabase } from '@/integrations/supabase/client';
import { Reward } from "@/lib/rewardUtils";
import { saveRewardsToDB, savePointsToDB, saveDomPointsToDB } from "../indexedDB/useIndexedDB";

// Interface for buying a reward
interface BuyRewardParams {
  rewardId: string;
  cost: number;
  isDomReward?: boolean;
}

// Function to buy a reward
const buyReward = async ({ rewardId, cost, isDomReward = false }: BuyRewardParams): Promise<Reward> => {
  // Get current user
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) {
    throw new Error("User not authenticated");
  }
  
  // Get current reward
  const { data: reward, error: fetchError } = await supabase
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .single();
    
  if (fetchError) throw fetchError;
  
  // Get current points
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('points, dom_points')
    .eq('id', userData.user.id)
    .single();
    
  if (profileError) throw profileError;
  
  // Check if we have enough points
  const currentPoints = isDomReward ? (profileData?.dom_points || 0) : (profileData?.points || 0);
  if (currentPoints < cost) {
    throw new Error(`Not enough ${isDomReward ? 'dom ' : ''}points to buy this reward`);
  }
  
  // Update supply of the reward
  const { data: updatedReward, error: updateError } = await supabase
    .from('rewards')
    .update({ 
      supply: (reward?.supply || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', rewardId)
    .select()
    .single();
    
  if (updateError) throw updateError;
  
  // Update user points
  const newPoints = currentPoints - cost;
  const { error: pointsError } = await supabase
    .from('profiles')
    .update({ 
      [isDomReward ? 'dom_points' : 'points']: newPoints 
    })
    .eq('id', userData.user.id);
    
  if (pointsError) throw pointsError;
  
  // Update points in cache
  if (isDomReward) {
    queryClient.setQueryData(['dom_points'], newPoints);
    await saveDomPointsToDB(newPoints);
  } else {
    queryClient.setQueryData(['points'], newPoints);
    await savePointsToDB(newPoints);
  }
  
  return updatedReward as Reward;
};

// Hook for buying rewards
export function useBuyReward() {
  return useMutation({
    mutationFn: buyReward,
    onSuccess: (updatedReward) => {
      // Update rewards in cache
      queryClient.setQueryData(['rewards'], (oldRewards: Reward[] = []) => {
        const updatedRewards = oldRewards.map(reward => 
          reward.id === updatedReward.id ? updatedReward : reward
        );
        
        // Update IndexedDB
        saveRewardsToDB(updatedRewards);
        
        return updatedRewards;
      });
    }
  });
}
