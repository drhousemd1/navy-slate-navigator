
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRewards, saveReward, deleteReward, updateRewardSupply, Reward } from '@/lib/rewardUtils';
import { toast } from '@/hooks/use-toast';

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
  const queryClient = useQueryClient();
  
  // Fetch rewards using React Query
  const { 
    data: rewards = [], 
    isLoading,
    refetch 
  } = useQuery({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
  });
  
  console.log("RewardsProvider rendered with rewards:", rewards.map(r => ({ 
    id: r.id, 
    title: r.title, 
    created_at: r.created_at,
    background_image_url: r.background_image_url?.substring(0, 30) + '...' 
  })));

  // Fetch total points
  useEffect(() => {
    const fetchTotalPoints = async () => {
      try {
        // Mock implementation - you should replace with actual implementation
        setTotalPoints(500);
      } catch (error) {
        console.error('Error fetching total points:', error);
      }
    };

    fetchTotalPoints();
  }, []);

  const refetchRewards = useCallback(async () => {
    console.log("Manually refetching rewards");
    await refetch();
  }, [refetch]);

  // Save a reward (create or update)
  const handleSaveReward = useCallback(async (rewardData: any, index: number | null): Promise<Reward | null> => {
    console.log("Handling save reward with data:", rewardData, "at index:", index);
    
    try {
      // Clean up data before saving
      const dataToSave = { ...rewardData };
      
      // Ensure null is properly handled for background_image_url
      if (!dataToSave.background_image_url) {
        dataToSave.background_image_url = null;
      }
      
      let result: Reward | null = null;
      
      if (index !== null) {
        // Update existing reward - CRITICAL: Preserve the original reward's ID
        const existingReward = rewards[index];
        console.log("Updating existing reward with ID:", existingReward.id);
        
        // Never send created_at or updated_at to the update function
        const { created_at, updated_at, ...cleanData } = dataToSave;
        
        result = await saveReward(cleanData as Reward & { title: string }, existingReward.id);
      } else {
        // Create new reward
        console.log("Creating new reward");
        result = await saveReward(dataToSave as Reward & { title: string });
      }
      
      // Refresh rewards list
      if (result) {
        console.log("Reward saved successfully:", result);
        queryClient.invalidateQueries({ queryKey: ['rewards'] });
        return result;
      }
      
      return null;
    } catch (error) {
      console.error("Error in handleSaveReward:", error);
      throw error;
    }
  }, [rewards, queryClient]);

  // Delete a reward
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
        queryClient.invalidateQueries({ queryKey: ['rewards'] });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error in handleDeleteReward:", error);
      throw error;
    }
  }, [rewards, queryClient]);

  // Buy a reward
  const handleBuyReward = useCallback(async (id: string) => {
    console.log("Handling buy reward with ID:", id);
    
    try {
      const reward = rewards.find(r => r.id === id);
      if (!reward) {
        console.error("Reward not found with ID:", id);
        return;
      }
      
      // Update the reward supply
      const updatedSupply = reward.supply + 1;
      const success = await updateRewardSupply(reward.id, updatedSupply);
      
      if (success) {
        console.log("Reward bought successfully");
        queryClient.invalidateQueries({ queryKey: ['rewards'] });
        
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
  }, [rewards, queryClient]);

  // Use a reward
  const handleUseReward = useCallback(async (id: string) => {
    console.log("Handling use reward with ID:", id);
    
    try {
      const reward = rewards.find(r => r.id === id);
      if (!reward) {
        console.error("Reward not found with ID:", id);
        return;
      }
      
      // Cannot use a reward with no supply
      if (reward.supply <= 0) {
        console.error("Cannot use reward with no supply");
        
        toast({
          title: "Cannot Use Reward",
          description: "You don't have any of this reward to use.",
          variant: "destructive",
        });
        
        return;
      }
      
      // Update the reward supply
      const updatedSupply = reward.supply - 1;
      const success = await updateRewardSupply(reward.id, updatedSupply);
      
      if (success) {
        console.log("Reward used successfully");
        queryClient.invalidateQueries({ queryKey: ['rewards'] });
        
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
  }, [rewards, queryClient]);

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
