import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRewards, saveReward, deleteReward, updateRewardSupply, Reward } from '@/lib/rewardUtils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RewardsContextType {
  rewards: Reward[];
  totalPoints: number;
  isLoading: boolean;
  refetchRewards: () => Promise<void>;
  handleSaveReward: (rewardData: any, index: number | null) => Promise<Reward | null>;
  handleDeleteReward: (index: number) => Promise<boolean>;
  handleBuyReward: (id: string) => Promise<void>;
  handleUseReward: (id: string) => Promise<void>;
}

const RewardsContext = createContext<RewardsContextType>({
  rewards: [],
  totalPoints: 0,
  isLoading: true,
  refetchRewards: async () => {},
  handleSaveReward: async () => null,
  handleDeleteReward: async () => false,
  handleBuyReward: async () => {},
  handleUseReward: async () => {},
});

export const useRewards = () => useContext(RewardsContext);

export const RewardsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const queryClient = useQueryClient();
  
  const { 
    data: fetchedRewards = [], 
    isLoading,
    refetch 
  } = useQuery({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
  });
  
  useEffect(() => {
    if (fetchedRewards.length > 0) {
      console.log("[RewardsContext] Setting rewards from fetchedRewards with preserved order:", 
        fetchedRewards.map((r, i) => ({ 
          position: i,
          id: r.id, 
          title: r.title,
          created_at: r.created_at
        }))
      );
      setRewards(fetchedRewards);
    }
  }, [fetchedRewards]);
  
  useEffect(() => {
    const fetchTotalPoints = async () => {
      try {
        setTotalPoints(500);
      } catch (error) {
        console.error('Error fetching total points:', error);
      }
    };

    fetchTotalPoints();
  }, []);

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
  }, [refetch]);

  const handleSaveReward = useCallback(async (rewardData: any, index: number | null): Promise<Reward | null> => {
    console.log("[RewardsContext] Handling save reward with data:", rewardData, "at index:", index);
    
    try {
      const dataToSave = { ...rewardData };
      
      if (!dataToSave.background_image_url) {
        dataToSave.background_image_url = null;
      }
      
      let result: Reward | null = null;
      
      if (index !== null) {
        // CRITICAL: We're updating an existing reward
        const existingReward = rewards[index];
        
        // CRITICAL: Log the exact position and complete rewards list before any update
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
        
        // CRITICAL: Only update fields that the user has changed, never update timestamps
        const fieldsToUpdate = {
          title: dataToSave.title,
          description: dataToSave.description,
          cost: dataToSave.cost,
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
        
        console.log("[RewardsContext] Updating only these fields:", Object.keys(fieldsToUpdate));
        
        // CRITICAL: Never merge update with Supabase auto-update of timestamps
        const { data, error } = await supabase
          .from('rewards')
          .update(fieldsToUpdate)
          .eq('id', existingReward.id)
          .select();
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // CRITICAL: Preserve the original created_at timestamp to prevent reordering
          result = {
            ...data[0],
            created_at: existingReward.created_at // Preserve original created_at
          };
          
          // CRITICAL: Update the rewards array IN PLACE at the existing index
          // This ensures we don't change the array order at all
          const updatedRewards = [...rewards];
          updatedRewards[index] = result;
          
          console.log("[RewardsContext] Updated reward at position", index, 
            "ID:", result.id, 
            "title:", result.title);
          
          // CRITICAL: Log the exact rewards list after update to verify order preservation
          console.log("[RewardsContext] Rewards list AFTER update:", 
            updatedRewards.map((r, i) => ({
              position: i,
              id: r.id,
              title: r.title,
              created_at: r.created_at,
              updated_at: r.updated_at
            }))
          );
          
          // Set the updated rewards array, maintaining exact order
          setRewards(updatedRewards);
        }
      } else {
        // This is a new reward being created
        console.log("[RewardsContext] Creating new reward");
        result = await saveReward(dataToSave as Reward & { title: string });
        
        if (result) {
          // For new rewards, append to the existing list
          console.log("[RewardsContext] New reward created with ID:", result.id);
          
          // Preserve existing list and append new reward
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
        }
      }
      
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

  const handleBuyReward = useCallback(async (id: string) => {
    console.log("Handling buy reward with ID:", id);
    
    try {
      const rewardIndex = rewards.findIndex(r => r.id === id);
      if (rewardIndex === -1) {
        console.error("Reward not found with ID:", id);
        return;
      }
      
      const reward = rewards[rewardIndex];
      
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
  }, [rewards]);

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

  const value = {
    rewards,
    totalPoints,
    isLoading,
    refetchRewards,
    handleSaveReward,
    handleDeleteReward,
    handleBuyReward,
    handleUseReward,
  };

  return (
    <RewardsContext.Provider value={value}>
      {children}
    </RewardsContext.Provider>
  );
};
