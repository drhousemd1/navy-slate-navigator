
import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRewards, saveReward, deleteReward, updateRewardSupply, Reward } from '@/lib/rewardUtils';
import { toast } from '@/hooks/use-toast';
import { usePointsManagement } from './usePointsManagement';
import { supabase } from '@/integrations/supabase/client';

export const useRewardOperations = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const { totalPoints, setTotalPoints, updatePointsInDatabase, refreshPointsFromDatabase } = usePointsManagement();

  // New state to hold usage data per reward by id
  const [rewardUsageMap, setRewardUsageMap] = useState<{ [id: string]: boolean[] }>({});

  const { 
    data: fetchedRewards = [], 
    isLoading,
    refetch 
  } = useQuery({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
  });

  // Function to fetch usage data for a reward from the DB
  const fetchUsageDataByRewardId = useCallback(async (rewardId: string): Promise<boolean[]> => {
    try {
      // Fetch usage for current week for the reward
      const today = new Date();
      const currentYear = today.getFullYear();
      const weekNumber = `${currentYear}-${Math.floor(today.getDate() / 7)}`;

      const { data, error } = await supabase
        .from('reward_usage')
        .select('day_of_week, used')
        .eq('reward_id', rewardId)
        .eq('week_number', weekNumber);

      if (error) {
        console.error(`[useRewardOperations] Error fetching usage data for reward ${rewardId}:`, error);
        return Array(7).fill(false);
      }

      const usageArray = Array(7).fill(false);
      if (data && data.length > 0) {
        data.forEach((entry: {day_of_week: number, used: boolean}) => {
          if (entry.day_of_week !== null && entry.day_of_week >= 0 && entry.day_of_week < 7) {
            usageArray[entry.day_of_week] = Boolean(entry.used);
          }
        });
      }

      return usageArray;
    } catch (error) {
      console.error(`[useRewardOperations] Exception fetching usage data for reward ${rewardId}:`, error);
      return Array(7).fill(false);
    }
  }, []);

  // Refresh usage data for all rewards
  const refreshAllUsageData = useCallback(async () => {
    if (rewards.length === 0) return;
    const usageMap: { [id: string]: boolean[] } = {};
    for (const reward of rewards) {
      usageMap[reward.id] = await fetchUsageDataByRewardId(reward.id);
    }
    setRewardUsageMap(usageMap);
  }, [rewards, fetchUsageDataByRewardId]);

  // Fetch usage data whenever rewards change or on mount
  useEffect(() => {
    refreshAllUsageData();
  }, [refreshAllUsageData]);

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
      // Refresh usage data for updated rewards
      const usageMap: { [id: string]: boolean[] } = {};
      for (const reward of data) {
        usageMap[reward.id] = await fetchUsageDataByRewardId(reward.id);
      }
      setRewardUsageMap(usageMap);
    }
    
    await refreshPointsFromDatabase();
  }, [refetch, refreshPointsFromDatabase, fetchUsageDataByRewardId]);

  const getTotalRewardsSupply = useCallback(() => {
    return rewards.reduce((total, reward) => total + reward.supply, 0);
  }, [rewards]);

  const handleSaveReward = useCallback(async (rewardData: any, index: number | null): Promise<Reward | null> => {
    console.log("[RewardsContext] Handling save reward with data:", rewardData, "at index:", index);
    
    try {
      const dataToSave = { ...rewardData };
      
      if (!dataToSave.background_image_url) {
        dataToSave.background_image_url = null;
      }
      
      let result: Reward | null = null;
      
      if (index !== null) {
        const existingReward = rewards[index];
        
        console.log("[RewardsContext] Rewards list BEFORE update:", 
          rewards.map((r, i) => ({
            position: i,
            id: r.id,
            title: r.title,
            created_at: r.created_at,
            updated_at: r.updated_at
          }))
        );
        
        console.log("[RewardsContext] Updating reward at position:", index, 
          "with ID:", existingReward.id, 
          "title:", existingReward.title);
        
        const fieldsToUpdate = {
          title: dataToSave.title,
          description: dataToSave.description,
          cost: dataToSave.cost,
          icon_name: dataToSave.icon_name,
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
        
        console.log("[RewardsContext] Updating only these fields:", Object.keys(fieldsToUpdate));
        
        const { data, error } = await supabase
          .from('rewards')
          .update(fieldsToUpdate)
          .eq('id', existingReward.id)
          .select();
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          result = {
            ...data[0],
            created_at: existingReward.created_at
          };
          
          const updatedRewards = [...rewards];
          updatedRewards[index] = result;
          
          console.log("[RewardsContext] Updated reward at position", index, 
            "ID:", result.id, 
            "title:", result.title);
          
          console.log("[RewardsContext] Rewards list AFTER update:", 
            updatedRewards.map((r, i) => ({
              position: i,
              id: r.id,
              title: r.title,
              created_at: r.created_at,
              updated_at: r.updated_at
            }))
          );
          
          setRewards(updatedRewards);

          // Refresh usage data after update for this reward
          usageDataRefreshForSingleReward(result.id);
        }
      } else {
        result = await saveReward(dataToSave as Reward & { title: string });
        
        if (result) {
          setRewards(prevRewards => {
            const newList = [...prevRewards, result as Reward];
            
            console.log("[RewardsContext] Rewards list after adding new reward:", 
              newList.map((r, i) => ({
                position: i,
                id: r.id,
                title: r.title,
                created_at: r.created_at
              }))
            );
            
            return newList;
          });
          // Refresh usage for new reward
          usageDataRefreshForSingleReward(result.id);
        }
      }
      
      return result;
    } catch (error) {
      console.error("[RewardsContext] Error in handleSaveReward:", error);
      throw error;
    }
  }, [rewards]);

  // Helper to refresh usage for a single reward immediately
  const usageDataRefreshForSingleReward = useCallback(async (rewardId: string) => {
    const usageDataForReward = await fetchUsageDataByRewardId(rewardId);
    setRewardUsageMap(prev => ({
      ...prev,
      [rewardId]: usageDataForReward
    }));
  }, [fetchUsageDataByRewardId]);

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
        
        // Remove usage data for deleted reward
        setRewardUsageMap(prev => {
          const copy = { ...prev };
          delete copy[rewardToDelete.id];
          return copy;
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error in handleDeleteReward:", error);
      throw error;
    }
  }, [rewards]);

  const handleBuyReward = useCallback(async (id: string, cost: number) => {
    console.log("Handling buy reward with ID:", id, "Cost:", cost);
    
    try {
      if (totalPoints < cost) {
        toast({
          title: "Not Enough Points",
          description: `You need ${cost} points to buy this reward.`,
          variant: "destructive",
        });
        return;
      }
      
      const rewardIndex = rewards.findIndex(r => r.id === id);
      if (rewardIndex === -1) {
        console.error("Reward not found with ID:", id);
        return;
      }
      
      const reward = rewards[rewardIndex];
      
      const newTotalPoints = totalPoints - cost;
      setTotalPoints(newTotalPoints);
      
      const pointsUpdateSuccess = await updatePointsInDatabase(newTotalPoints);
      
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
  }, [rewards, totalPoints, updatePointsInDatabase, setTotalPoints]);

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
        const dayOfWeek = today.getDay(); // 0 is Sunday in JS
        // Convert Sunday=0 to Monday-based 0 index (Monday=0..Sunday=6)
        const mondayBasedDayOfWeek = (dayOfWeek + 6) % 7;

        const weekNumber = `${today.getFullYear()}-${Math.floor(today.getDate() / 7)}`;
        
        const { error: usageError } = await supabase
          .from('reward_usage')
          .insert({
            reward_id: reward.id,
            day_of_week: mondayBasedDayOfWeek,
            week_number: weekNumber,
            used: true,
            created_at: new Date().toISOString()
          });
          
        if (usageError) {
          console.error("Error recording reward usage:", usageError);
        } else {
          console.log("Reward usage recorded successfully");
        }
        
        const updatedRewards = [...rewards];
        updatedRewards[rewardIndex] = { ...reward, supply: updatedSupply };
        setRewards(updatedRewards);

        // Refresh usage data locally for this reward to update calendar
        const updatedUsageData = await fetchUsageDataByRewardId(reward.id);
        setRewardUsageMap(prev => ({
          ...prev,
          [reward.id]: updatedUsageData
        }));
        
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
  }, [rewards, fetchUsageDataByRewardId]);

  return {
    rewards,
    setRewards,
    rewardUsageMap, // Expose usage map for usage data per reward
    isLoading,
    fetchedRewards,
    totalPoints,
    setTotalPoints,
    refetchRewards,
    handleSaveReward,
    handleDeleteReward,
    handleBuyReward,
    handleUseReward,
    getTotalRewardsSupply,
    refreshPointsFromDatabase
  };
};
