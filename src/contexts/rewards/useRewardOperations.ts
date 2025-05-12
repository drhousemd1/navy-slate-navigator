
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRewards, saveReward, deleteReward, updateRewardSupply, Reward } from '@/lib/rewardUtils';
import { toast } from '@/hooks/use-toast';
import { usePointsManagement } from './usePointsManagement';
import { supabase } from '@/integrations/supabase/client';

export const useRewardOperations = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const { totalPoints, domPoints, setTotalPoints, setDomPoints, updatePointsInDatabase, updateDomPointsInDatabase, refreshPointsFromDatabase } = usePointsManagement();
  
  const { 
    data: fetchedRewards = [], 
    isLoading,
    refetch 
  } = useQuery({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
  });

  const refetchRewards = useCallback(async () => {
    console.log("[RewardsContext] Manually refetching rewards");
    const { data } = await refetch();
    if (data) {
      console.log("[RewardsContext] Setting rewards after manual refetch with preserved order:", 
        data.map((r, i) => ({ 
          position: i,
          id: r.id, 
          title: r.title,
          created_at: r.created_at
        }))
      );
      setRewards(data);
    }
    
    await refreshPointsFromDatabase();
  }, [refetch, refreshPointsFromDatabase]);

  const getTotalRewardsSupply = useCallback(() => {
    return rewards.reduce((total, reward) => total + reward.supply, 0);
  }, [rewards]);
  
  const getTotalDomRewardsSupply = useCallback(() => {
    return rewards.reduce((total, reward) => {
      // Only count supplies for dom rewards
      return total + (reward.is_dom_reward ? reward.supply : 0);
    }, 0);
  }, [rewards]);

  const handleSaveReward = useCallback(async (rewardData: any, index: number | null): Promise<Reward | null> => {
    console.log("[RewardsContext] Handling save reward with data:", rewardData, "at index:", index);
    console.log("[RewardsContext] is_dom_reward value:", rewardData.is_dom_reward);
    
    const startTime = performance.now();
    
    try {
      const dataToSave = { ...rewardData };
      
      if (!dataToSave.background_image_url) {
        dataToSave.background_image_url = null;
      }
      
      // Ensure is_dom_reward is properly included and is a boolean
      dataToSave.is_dom_reward = Boolean(dataToSave.is_dom_reward ?? false);
      
      let result: Reward | null = null;
      
      if (index !== null) {
        const existingReward = rewards[index];
        
        console.log("[RewardsContext] Rewards list BEFORE update:", 
          rewards.map((r, i) => ({
            position: i,
            id: r.id,
            title: r.title,
            is_dom_reward: r.is_dom_reward,
            created_at: r.created_at,
            updated_at: r.updated_at
          }))
        );
        
        console.log("[RewardsContext] Updating reward at position:", index, 
          "with ID:", existingReward.id, 
          "title:", existingReward.title,
          "is_dom_reward:", dataToSave.is_dom_reward);
        
        // Include is_dom_reward in the fields to update
        const fieldsToUpdate = {
          title: dataToSave.title,
          description: dataToSave.description,
          cost: dataToSave.cost,
          is_dom_reward: dataToSave.is_dom_reward, // Added this field explicitly
          icon_name: dataToSave.icon_name,
          icon_url: dataToSave.icon_url,
          icon_color: dataToSave.icon_color,
          background_image_url: dataToSave.background_image_url,
          background_opacity: dataToSave.background_opacity,
          focal_point_x: dataToSave.focal_point_x,
          focal_point_y: dataToSave.focal_point_y,
          highlight_effect: dataToSave.highlight_effect,
          title_color: dataToSave.title_color,
          subtext_color: dataToSave.subtext_color,
          calendar_color: dataToSave.calendar_color,
        };
        
        console.log("[RewardsContext] Updating with these fields:", Object.keys(fieldsToUpdate));
        console.log("[RewardsContext] is_dom_reward value being sent:", fieldsToUpdate.is_dom_reward);
        
        const { data, error } = await supabase
          .from('rewards')
          .update(fieldsToUpdate)
          .eq('id', existingReward.id)
          .select();
        
        const endDbTime = performance.now();
        console.log(`[RewardsContext] Database update took ${endDbTime - startTime}ms`);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          result = {
            ...data[0],
            is_dom_reward: data[0]?.is_dom_reward ?? false, // Default to false if not present
            created_at: existingReward.created_at
          } as Reward;
          
          const updatedRewards = [...rewards];
          updatedRewards[index] = result;
          
          console.log("[RewardsContext] Updated reward at position", index, 
            "ID:", result.id, 
            "title:", result.title,
            "is_dom_reward:", result.is_dom_reward);
          
          console.log("[RewardsContext] Rewards list AFTER update:", 
            updatedRewards.map((r, i) => ({
              position: i,
              id: r.id,
              title: r.title,
              is_dom_reward: r.is_dom_reward,
              created_at: r.created_at,
              updated_at: r.updated_at
            }))
          );
          
          setRewards(updatedRewards);
        }
      } else {
        // For new rewards, is_dom_reward is already included in dataToSave
        console.log("[RewardsContext] Creating new reward with is_dom_reward:", dataToSave.is_dom_reward);
        result = await saveReward(dataToSave as Reward & { title: string });
        
        if (result) {
          setRewards(prevRewards => {
            const newList = [...prevRewards, result as Reward];
            
            console.log("[RewardsContext] Rewards list after adding new reward:", 
              newList.map((r, i) => ({
                position: i,
                id: r.id,
                title: r.title,
                is_dom_reward: r.is_dom_reward,
                created_at: r.created_at
              }))
            );
            
            return newList;
          });
        }
      }
      
      const endTime = performance.now();
      console.log(`[RewardsContext] Total save operation took ${endTime - startTime}ms`);
      
      return result;
    } catch (error) {
      console.error("[RewardsContext] Error in handleSaveReward:", error);
      throw error;
    }
  }, [rewards]);

  const handleDeleteReward = useCallback(async (index: number): Promise<boolean> => {
    console.log("Handling delete reward at index:", index);
    
    try {
      const rewardToDelete = rewards[index];
      if (!rewardToDelete || !rewardToDelete.id) {
        console.error("Invalid reward index or reward has no ID:", index);
        return false;
      }
      
      const success = await deleteReward(rewardToDelete.id);
      
      if (success) {
        console.log("Reward deleted successfully");
        setRewards(prevRewards => prevRewards.filter((_, i) => i !== index));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error in handleDeleteReward:", error);
      throw error;
    }
  }, [rewards]);

  const handleBuyReward = useCallback(async ({ rewardId, cost, isDomReward = false }: { rewardId: string, cost: number, isDomReward?: boolean }) => {
    console.log("Handling buy reward with ID:", rewardId, "Cost:", cost, "Is Dom Reward:", isDomReward);
    
    try {
      // Check if we have enough points based on reward type
      const currentPoints = isDomReward ? domPoints : totalPoints;
      
      if (currentPoints < cost) {
        toast({
          title: "Not Enough Points",
          description: `You need ${cost} ${isDomReward ? "dom " : ""}points to buy this reward.`,
          variant: "destructive",
        });
        return;
      }
      
      const rewardIndex = rewards.findIndex(r => r.id === rewardId);
      if (rewardIndex === -1) {
        console.error("Reward not found with ID:", rewardId);
        return;
      }
      
      const reward = rewards[rewardIndex];
      console.log("Found reward:", reward.title, "is_dom_reward:", reward.is_dom_reward);
      
      // Determine if this is a dom reward from the reward itself if not explicitly provided
      const isRewardDominant = isDomReward !== undefined ? isDomReward : Boolean(reward.is_dom_reward);
      console.log("Final determination of isDomReward:", isRewardDominant);
      
      // Deduct points based on reward type
      const newPoints = currentPoints - cost;
      
      if (isRewardDominant) {
        await setDomPoints(newPoints);
        let pointsUpdateSuccess = true;
        try {
          await updateDomPointsInDatabase(newPoints);
        } catch (error) {
          pointsUpdateSuccess = false;
        }
        
        if (!pointsUpdateSuccess) {
          console.error("Failed to update dom points in database");
          setDomPoints(domPoints);
          
          toast({
            title: "Error",
            description: "Failed to update dom points. Please try again.",
            variant: "destructive",
          });
          return;
        }
      } else {
        await setTotalPoints(newPoints);
        let pointsUpdateSuccess = true;
        try {
          await updatePointsInDatabase(newPoints);
        } catch (error) {
          pointsUpdateSuccess = false;
        }
        
        if (!pointsUpdateSuccess) {
          console.error("Failed to update points in database");
          setTotalPoints(totalPoints);
          
          toast({
            title: "Error",
            description: "Failed to update points. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }
      
      const updatedSupply = reward.supply + 1;
      const success = await updateRewardSupply(reward.id, updatedSupply);
      
      if (success) {
        console.log("Reward bought successfully");
        
        const updatedRewards = [...rewards];
        updatedRewards[rewardIndex] = { ...reward, supply: updatedSupply };
        setRewards(updatedRewards);
        
        toast({
          title: "Reward Purchased",
          description: `You purchased ${reward.title}`,
        });
      }
    } catch (error) {
      console.error("Error in handleBuyReward:", error);
      
      toast({
        title: "Error",
        description: "Failed to purchase reward. Please try again.",
        variant: "destructive",
      });
    }
  }, [rewards, totalPoints, domPoints, updatePointsInDatabase, updateDomPointsInDatabase, setTotalPoints, setDomPoints]);

  const handleUseReward = useCallback(async (id: string) => {
    console.log("Handling use reward with ID:", id);
    
    try {
      const rewardIndex = rewards.findIndex(r => r.id === id);
      if (rewardIndex === -1) {
        console.error("Reward not found with ID:", id);
        return;
      }
      
      const reward = rewards[rewardIndex];
      
      if (reward.supply <= 0) {
        console.error("Cannot use reward with no supply");
        
        toast({
          title: "Cannot Use Reward",
          description: "You don't have any of this reward to use.",
          variant: "destructive",
        });
        
        return;
      }
      
      const updatedSupply = reward.supply - 1;
      const success = await updateRewardSupply(reward.id, updatedSupply);
      
      if (success) {
        console.log("Reward used successfully");
        
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0-6, where 0 is Sunday
        const weekNumber = `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`;
        
        try {
          await supabase
            .from('reward_usage')
            .insert({
              reward_id: reward.id,
              day_of_week: dayOfWeek,
              week_number: weekNumber,
              used: true,
              created_at: new Date().toISOString()
            });
          console.log("Reward usage recorded successfully");
        } catch (error) {
          console.error("Error recording reward usage:", error);
        }
        
        const updatedRewards = [...rewards];
        updatedRewards[rewardIndex] = { ...reward, supply: updatedSupply };
        setRewards(updatedRewards);
        
        toast({
          title: "Reward Used",
          description: `You used ${reward.title}`,
        });
      }
    } catch (error) {
      console.error("Error in handleUseReward:", error);
      
      toast({
        title: "Error",
        description: "Failed to use reward. Please try again.",
        variant: "destructive",
      });
    }
  }, [rewards]);

  return {
    rewards,
    setRewards,
    isLoading,
    fetchedRewards,
    totalPoints,
    domPoints,
    setTotalPoints,
    setDomPoints,
    refetchRewards,
    handleSaveReward,
    handleDeleteReward,
    handleBuyReward,
    handleUseReward,
    getTotalRewardsSupply,
    getTotalDomRewardsSupply,
    refreshPointsFromDatabase
  };
};
