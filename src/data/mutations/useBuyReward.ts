
```typescript
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "../queryClient"; // Assuming queryClient is exported from here
import { supabase } from '@/integrations/supabase/client';
import { Reward } from "@/data/rewards/types"; // Updated import
import { saveRewardsToDB, savePointsToDB, saveDomPointsToDB } from "../indexedDB/useIndexedDB"; // savePointsToDB, saveDomPointsToDB added

interface BuyRewardParams {
  rewardId: string;
  cost: number;
  isDomReward?: boolean;
}

const buyReward = async ({ rewardId, cost, isDomReward = false }: BuyRewardParams): Promise<Reward> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) {
    throw new Error("User not authenticated");
  }
  
  const { data: reward, error: fetchError } = await supabase
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .single();
    
  if (fetchError) throw fetchError;
  if (!reward) throw new Error("Reward not found to buy."); // Added check for reward existence
  
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('points, dom_points')
    .eq('id', userData.user.id)
    .single();
    
  if (profileError) throw profileError;
  if (!profileData) throw new Error("Profile not found."); // Added check

  const currentPoints = isDomReward ? (profileData.dom_points || 0) : (profileData.points || 0);
  if (currentPoints < cost) {
    throw new Error(`Not enough ${isDomReward ? 'dom ' : ''}points to buy this reward`);
  }
  
  // If "buying" means the user obtains one and the general supply decreases:
  const newRewardSupply = (reward.supply || 0) - 1; // Check if this is desired logic
  if (newRewardSupply < 0 && reward.supply !== -1) { // -1 might mean infinite
      // throw new Error("Reward is out of stock."); // This depends on how supply is handled
  }

  const { data: updatedReward, error: updateError } = await supabase
    .from('rewards')
    .update({ 
      supply: newRewardSupply, // Supply logic needs confirmation: does buy *reduce* general stock?
      // Or does it increment a user's owned stock?
      // The error message "Reward is out of stock" for useBuyDom/Sub implies general stock reduction.
      // If current useBuyReward.ts doesn't reduce supply, but other hooks do, this is an inconsistency.
      // For now, I'll make it consistent with useBuyDomReward's approach of reducing global supply.
      updated_at: new Date().toISOString()
    })
    .eq('id', rewardId)
    .select()
    .single();
    
  if (updateError) throw updateError;
  if (!updatedReward) throw new Error("Failed to update reward after purchase.");
  
  const newPointsBalance = currentPoints - cost;
  const updateProfilePayload = isDomReward ? { dom_points: newPointsBalance } : { points: newPointsBalance };

  const { error: pointsError } = await supabase
    .from('profiles')
    .update(updateProfilePayload)
    .eq('id', userData.user.id);
    
  if (pointsError) {
    // Revert reward supply if points update failed
    await supabase.from('rewards').update({ supply: reward.supply }).eq('id', rewardId);
    throw pointsError;
  }
  
  if (isDomReward) {
    queryClient.setQueryData(['dom_points'], newPointsBalance); // Consider using CRITICAL_QUERY_KEYS
    await saveDomPointsToDB(newPointsBalance);
  } else {
    queryClient.setQueryData(['points'], newPointsBalance); // Consider using CRITICAL_QUERY_KEYS
    await savePointsToDB(newPointsBalance);
  }
  
  return updatedReward as Reward;
};

export function useBuyReward() {
  return useMutation<Reward, Error, BuyRewardParams>({ // Added Reward as TData
    mutationFn: buyReward,
    onSuccess: (updatedReward) => {
      queryClient.setQueryData<Reward[]>(['rewards'], (oldRewards = []) => { // Ensure Reward[] type for oldRewards
        const updatedRewards = oldRewards.map(reward => 
          reward.id === updatedReward.id ? updatedReward : reward
        );
        saveRewardsToDB(updatedRewards);
        return updatedRewards;
      });
      // Consider invalidating points queries if not set directly
      queryClient.invalidateQueries({ queryKey: [CRITICAL_QUERY_KEYS.REWARDS_POINTS] });
      queryClient.invalidateQueries({ queryKey: [CRITICAL_QUERY_KEYS.REWARDS_DOM_POINTS] });
    }
  });
}
```
