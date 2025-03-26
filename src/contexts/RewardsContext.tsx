
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';
import { toast } from '../hooks/use-toast';

// Define initial rewards data
const initialRewards = [
  {
    title: "Movie Night",
    description: "Watch any movie of your choice",
    cost: 20,
    supply: 2,
    iconName: "Film"
  },
  {
    title: "Gaming Session",
    description: "1 hour of uninterrupted gaming time",
    cost: 15,
    supply: 1,
    iconName: "Gamepad2"
  },
  {
    title: "Dessert Treat",
    description: "Get your favorite dessert",
    cost: 25,
    supply: 3,
    iconName: "Cake"
  },
  {
    title: "Sleep In",
    description: "Sleep an extra hour in the morning",
    cost: 30,
    supply: 0,
    iconName: "Moon"
  }
];

// localStorage keys
const POINTS_STORAGE_KEY = 'rewardPoints';
const REWARD_USAGE_STORAGE_KEY = 'rewardUsage';

type RewardItem = {
  id?: string;
  title: string;
  description: string;
  cost: number;
  supply: number;
  iconName: string;
  icon_color?: string;
  background_image_url?: string;
  background_opacity?: number;
  focal_point_x?: number;
  focal_point_y?: number;
  highlight_effect?: boolean;
  title_color?: string;
  subtext_color?: string;
  calendar_color?: string;
};

interface RewardsContextType {
  totalPoints: number;
  rewards: RewardItem[];
  rewardUsage: Record<string, boolean[]>;
  handleBuy: (index: number) => void;
  handleUse: (index: number) => void;
  handleSaveReward: (rewardData: any, index: number | null) => Promise<void>;
  handleDeleteReward: (index: number) => Promise<void>;
  getRewardUsage: (index: number) => boolean[];
  getFrequencyCount: (index: number) => number;
  isLoading: boolean;
}

const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

export const RewardsProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  // Initialize state with localStorage values or defaults
  const [totalPoints, setTotalPoints] = useState(() => {
    const savedPoints = localStorage.getItem(POINTS_STORAGE_KEY);
    return savedPoints ? parseInt(savedPoints, 10) : 100;
  });
  
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize the usage tracking state
  const [rewardUsage, setRewardUsage] = useState(() => {
    const savedUsage = localStorage.getItem(REWARD_USAGE_STORAGE_KEY);
    return savedUsage ? JSON.parse(savedUsage) : {};
  });

  // Fetch rewards from Supabase on component mount
  useEffect(() => {
    const fetchRewards = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('rewards')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          setRewards(data);
        } else {
          // If no rewards exist, create initial ones
          for (const reward of initialRewards) {
            await supabase.from('rewards').insert(reward);
          }
          
          // Fetch again after inserting defaults
          const { data: refreshedData, error: refreshError } = await supabase
            .from('rewards')
            .select('*')
            .order('created_at', { ascending: true });
            
          if (refreshError) throw refreshError;
          if (refreshedData) setRewards(refreshedData);
        }
      } catch (error) {
        console.error('Error fetching rewards:', error);
        toast({
          title: "Error",
          description: "Failed to load rewards. Using local data instead.",
          variant: "destructive",
        });
        // Fallback to initial rewards if Supabase fails
        setRewards(initialRewards);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRewards();
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(POINTS_STORAGE_KEY, totalPoints.toString());
  }, [totalPoints]);

  useEffect(() => {
    localStorage.setItem(REWARD_USAGE_STORAGE_KEY, JSON.stringify(rewardUsage));
  }, [rewardUsage]);

  // Check if we need to reset the weekly tracking
  useEffect(() => {
    const lastResetKey = 'lastWeeklyReset';
    const lastReset = localStorage.getItem(lastResetKey);
    const now = new Date();
    const currentWeek = `${now.getFullYear()}-${now.getMonth() + 1}-${Math.floor(now.getDate() / 7)}`;
    
    if (lastReset !== currentWeek) {
      // Reset weekly tracking
      localStorage.setItem(lastResetKey, currentWeek);
      setRewardUsage({});
    }
  }, []);

  // Get the current day of week (0-6, Sunday-Saturday)
  const getCurrentDayOfWeek = () => {
    return new Date().getDay();
  };

  // Handle buying a reward
  const handleBuy = (index: number) => {
    const reward = rewards[index];
    
    // Check if user has enough points
    if (totalPoints >= reward.cost) {
      // Create a new array with the updated reward
      const updatedRewards = [...rewards];
      updatedRewards[index] = {
        ...reward,
        supply: reward.supply + 1
      };
      
      // Update state
      setRewards(updatedRewards);
      setTotalPoints(totalPoints - reward.cost);
      
      // Update Supabase
      supabase
        .from('rewards')
        .update({ supply: reward.supply + 1 })
        .eq('id', reward.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating reward supply:', error);
            toast({
              title: "Error",
              description: "Failed to update reward. Please try again.",
              variant: "destructive",
            });
          }
        });
    }
  };

  // Handle using a reward
  const handleUse = (index: number) => {
    const reward = rewards[index];
    
    // Check if the reward has any supply left
    if (reward.supply > 0) {
      // Create a new array with the updated reward
      const updatedRewards = [...rewards];
      updatedRewards[index] = {
        ...reward,
        supply: reward.supply - 1
      };
      
      // Update state
      setRewards(updatedRewards);
      
      // Update Supabase
      supabase
        .from('rewards')
        .update({ supply: reward.supply - 1 })
        .eq('id', reward.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating reward supply:', error);
            toast({
              title: "Error",
              description: "Failed to update reward. Please try again.",
              variant: "destructive",
            });
          }
        });
      
      // Update usage tracking for this reward
      const currentDay = getCurrentDayOfWeek();
      const rewardId = `reward-${index}`;
      
      const updatedUsage = { ...rewardUsage };
      if (!updatedUsage[rewardId]) {
        updatedUsage[rewardId] = Array(7).fill(false);
      }
      
      updatedUsage[rewardId][currentDay] = true;
      setRewardUsage(updatedUsage);
    }
  };

  // Get usage data for a specific reward
  const getRewardUsage = (index: number) => {
    const rewardId = `reward-${index}`;
    return rewardUsage[rewardId] || Array(7).fill(false);
  };
  
  // Calculate frequency count (number of days used this week)
  const getFrequencyCount = (index: number) => {
    const usage = getRewardUsage(index);
    return usage.filter(Boolean).length;
  };

  // Handle saving edited reward
  const handleSaveReward = async (rewardData: any, index: number | null) => {
    try {
      // Format the data to match the Supabase schema
      const formattedData = {
        title: rewardData.title,
        description: rewardData.description,
        cost: rewardData.cost,
        supply: rewardData.supply || 0,
        iconName: rewardData.iconName,
        icon_color: rewardData.icon_color,
        background_image_url: rewardData.background_image_url,
        background_opacity: rewardData.background_opacity,
        focal_point_x: rewardData.focal_point_x,
        focal_point_y: rewardData.focal_point_y,
        highlight_effect: rewardData.highlight_effect,
        title_color: rewardData.title_color,
        subtext_color: rewardData.subtext_color,
        calendar_color: rewardData.calendar_color
      };

      if (index !== null) {
        // Update existing reward
        const rewardId = rewards[index].id;
        const { error } = await supabase
          .from('rewards')
          .update(formattedData)
          .eq('id', rewardId);
          
        if (error) throw error;
        
        // Update the local state
        const updatedRewards = [...rewards];
        updatedRewards[index] = { ...formattedData, id: rewardId };
        setRewards(updatedRewards);
      } else {
        // Add new reward
        const { data, error } = await supabase
          .from('rewards')
          .insert(formattedData)
          .select();
          
        if (error) throw error;
        
        // Update the local state with the new reward that includes the generated id
        if (data && data.length > 0) {
          setRewards([...rewards, data[0]]);
        }
      }
      
      toast({
        title: "Success",
        description: index !== null ? "Reward updated successfully" : "Reward created successfully",
      });
    } catch (error) {
      console.error('Error saving reward:', error);
      toast({
        title: "Error",
        description: "Failed to save reward. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handle deleting a reward
  const handleDeleteReward = async (index: number) => {
    try {
      const rewardId = rewards[index].id;
      
      // Delete from Supabase
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId);
        
      if (error) throw error;
      
      // Update local state
      const updatedRewards = rewards.filter((_, i) => i !== index);
      setRewards(updatedRewards);
      
      // Also clean up the usage data
      const updatedUsage = { ...rewardUsage };
      delete updatedUsage[`reward-${index}`];
      
      // Reindex the remaining rewards' usage data
      Object.keys(updatedUsage).forEach(key => {
        const keyIndex = parseInt(key.split('-')[1]);
        if (keyIndex > index) {
          updatedUsage[`reward-${keyIndex - 1}`] = updatedUsage[key];
          delete updatedUsage[key];
        }
      });
      
      setRewardUsage(updatedUsage);
      
      toast({
        title: "Success",
        description: "Reward deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting reward:', error);
      toast({
        title: "Error",
        description: "Failed to delete reward. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <RewardsContext.Provider
      value={{
        totalPoints,
        rewards,
        rewardUsage,
        handleBuy,
        handleUse,
        handleSaveReward,
        handleDeleteReward,
        getRewardUsage,
        getFrequencyCount,
        isLoading
      }}
    >
      {children}
    </RewardsContext.Provider>
  );
};

export const useRewards = (): RewardsContextType => {
  const context = useContext(RewardsContext);
  if (context === undefined) {
    throw new Error('useRewards must be used within a RewardsProvider');
  }
  return context;
};
