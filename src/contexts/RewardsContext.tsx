
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
  
  // Fetch rewards using React Query
  const { 
    data: fetchedRewards = [], 
    isLoading,
    refetch 
  } = useQuery({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
  });
  
  // Update local state when fetched rewards change
  useEffect(() => {
    if (fetchedRewards.length > 0) {
      setRewards(fetchedRewards);
    }
  }, [fetchedRewards]);
  
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
    const { data } = await refetch();
    if (data) {
      setRewards(data);
    }
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
        // Update existing reward - implement direct update to maintain position
        const existingReward = rewards[index];
        console.log("Updating existing reward with ID:", existingReward.id);
        
        // Create an updated reward copy with the new data
        const updatedRewards = [...rewards];
        const updatedReward = {
          ...existingReward,
          ...dataToSave,
          // Preserve id and timestamps
          id: existingReward.id,
          created_at: existingReward.created_at,
        };
        
        // Update Supabase without affecting order
        const { error } = await supabase
          .from('rewards')
          .update({
            title: updatedReward.title,
            description: updatedReward.description,
            cost: updatedReward.cost,
            icon_name: updatedReward.icon_name,
            icon_url: updatedReward.icon_url,
            icon_color: updatedReward.icon_color,
            background_image_url: updatedReward.background_image_url,
            background_opacity: updatedReward.background_opacity,
            focal_point_x: updatedReward.focal_point_x,
            focal_point_y: updatedReward.focal_point_y,
            highlight_effect: updatedReward.highlight_effect,
            title_color: updatedReward.title_color,
            subtext_color: updatedReward.subtext_color,
            calendar_color: updatedReward.calendar_color,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReward.id);
        
        if (error) throw error;
        
        // Update local state without changing order
        updatedRewards[index] = updatedReward;
        setRewards(updatedRewards);
        
        console.log("Reward updated in place at index:", index);
        result = updatedReward;
      } else {
        // Create new reward
        console.log("Creating new reward");
        result = await saveReward(dataToSave as Reward & { title: string });
        
        // Add the new reward to local state
        if (result) {
          setRewards(prevRewards => [...prevRewards, result as Reward]);
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error in handleSaveReward:", error);
      throw error;
    }
  }, [rewards]);

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
        // Update local state by removing the deleted reward
        setRewards(prevRewards => prevRewards.filter((_, i) => i !== index));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error in handleDeleteReward:", error);
      throw error;
    }
  }, [rewards]);

  // Buy a reward
  const handleBuyReward = useCallback(async (id: string) => {
    console.log("Handling buy reward with ID:", id);
    
    try {
      const rewardIndex = rewards.findIndex(r => r.id === id);
      if (rewardIndex === -1) {
        console.error("Reward not found with ID:", id);
        return;
      }
      
      const reward = rewards[rewardIndex];
      
      // Update the reward supply
      const updatedSupply = reward.supply + 1;
      const success = await updateRewardSupply(reward.id, updatedSupply);
      
      if (success) {
        console.log("Reward bought successfully");
        
        // Update local state without changing order
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

  // Use a reward
  const handleUseReward = useCallback(async (id: string) => {
    console.log("Handling use reward with ID:", id);
    
    try {
      const rewardIndex = rewards.findIndex(r => r.id === id);
      if (rewardIndex === -1) {
        console.error("Reward not found with ID:", id);
        return;
      }
      
      const reward = rewards[rewardIndex];
      
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
        
        // Update local state without changing order
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
