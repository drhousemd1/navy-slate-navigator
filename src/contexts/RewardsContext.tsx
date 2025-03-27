import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRewards, saveReward, deleteReward, updateRewardSupply, Reward } from '@/lib/rewardUtils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RewardsContextType {
  rewards: Reward[];
  totalPoints: number;
  setTotalPoints: (points: number) => void;
  isLoading: boolean;
  refetchRewards: () => Promise<void>;
  handleSaveReward: (rewardData: any, index: number | null) => Promise<Reward | null>;
  handleDeleteReward: (index: number) => Promise<boolean>;
  handleBuyReward: (id: string, cost: number) => Promise<void>;
  handleUseReward: (id: string) => Promise<void>;
}

const RewardsContext = createContext<RewardsContextType>({
  rewards: [],
  totalPoints: 0,
  setTotalPoints: () => {},
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
        const { data, error } = await supabase
          .from('profiles')
          .select('points')
          .single();
        
        if (error) {
          console.error('Error fetching points:', error);
          setTotalPoints(500);
          return;
        }
        
        if (data) {
          console.log('Fetched points from database:', data.points);
          setTotalPoints(data.points);
        } else {
          console.log('No points data found, using default');
          setTotalPoints(500);
        }
      } catch (error) {
        console.error('Error fetching total points:', error);
        setTotalPoints(500);
      }
    };

    fetchTotalPoints();
  }, []);

  const updatePointsInDatabase = useCallback(async (newPoints: number) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authData.user) {
        console.error('Error getting user session:', authError);
        throw authError || new Error('User not authenticated');
      }
      
      const userId = authData.user.id;
      
      if (!userId) {
        console.error('User ID not found in session');
        throw new Error('User ID not available');
      }
      
      console.log('Updating points for user:', userId);
      
      const { error } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', userId);
      
      if (error) {
        console.error('Error updating points in database:', error);
        throw error;
      }
      
      console.log('Points updated in database:', newPoints);
      return true;
    } catch (error) {
      console.error('Error in updatePointsInDatabase:', error);
      return false;
    }
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
      
      const pointsUpdateSuccess = await updatePointsInDatabase(newTotalPoints);
      
      if (!pointsUpdateSuccess) {
        toast({
          title: "Error",
          description: "Failed to update points. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      setTotalPoints(newTotalPoints);
      
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
  }, [rewards, totalPoints, updatePointsInDatabase]);

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
    setTotalPoints,
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
