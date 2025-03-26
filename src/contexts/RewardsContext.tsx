import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Define initial rewards data - only used for fallback
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

// localStorage key for points (still using localStorage for points for now)
const POINTS_STORAGE_KEY = 'rewardPoints';

// Default points value if not found in localStorage
const DEFAULT_POINTS = 100;

// Define reward item type
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
  created_at?: string;
};

interface RewardsContextType {
  totalPoints: number;
  rewards: RewardItem[];
  rewardUsage: Record<string, boolean[]>;
  handleBuy: (index: number) => void;
  handleUse: (index: number) => void;
  handleSaveReward: (rewardData: any, index: number | null) => Promise<void>;
  handleDeleteReward: (index: number) => void;
  getRewardUsage: (index: number) => boolean[];
  getFrequencyCount: (index: number) => number;
  isLoading: boolean;
  refetchRewards: () => Promise<void>;
}

const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

// Fetch rewards function for React Query
const fetchRewards = async () => {
  console.log("Fetching rewards from Supabase");
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching rewards:', error);
    throw error;
  }
  
  console.log("Fetched rewards data:", data);
  
  // Map Supabase data to the format expected by the app
  return data?.map(reward => ({
    id: reward.id,
    title: reward.title,
    description: reward.description || '',
    cost: reward.cost,
    supply: reward.supply,
    iconName: reward.icon_name || '',
    icon_color: reward.icon_color,
    background_image_url: reward.background_image_url,
    background_opacity: reward.background_opacity,
    focal_point_x: reward.focal_point_x,
    focal_point_y: reward.focal_point_y,
    highlight_effect: reward.highlight_effect,
    title_color: reward.title_color,
    subtext_color: reward.subtext_color,
    calendar_color: reward.calendar_color,
    created_at: reward.created_at
  })) || [];
};

// Fetch reward usage data for the current week
const fetchRewardUsage = async () => {
  // Get current week number
  const now = new Date();
  const currentWeek = `${now.getFullYear()}-${now.getMonth() + 1}-${Math.floor(now.getDate() / 7)}`;
  
  console.log("Fetching reward usage for week:", currentWeek);
  
  const { data, error } = await supabase
    .from('reward_usage')
    .select('*')
    .eq('week_number', currentWeek);
  
  if (error) {
    console.error('Error fetching reward usage:', error);
    throw error;
  }
  
  console.log("Fetched reward usage data:", data);
  
  // Transform data to the format expected by the app
  const usageMap: Record<string, boolean[]> = {};
  
  if (data && data.length > 0) {
    data.forEach(usage => {
      const rewardId = usage.reward_id;
      if (!usageMap[`reward-${rewardId}`]) {
        usageMap[`reward-${rewardId}`] = Array(7).fill(false);
      }
      usageMap[`reward-${rewardId}`][usage.day_of_week] = usage.used;
    });
  }
  
  return usageMap;
};

export const RewardsProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize state with localStorage value for points
  const [totalPoints, setTotalPoints] = useState(() => {
    const savedPoints = localStorage.getItem(POINTS_STORAGE_KEY);
    return savedPoints ? parseInt(savedPoints, 10) : DEFAULT_POINTS;
  });

  // Use React Query for rewards data
  const { 
    data: rewards = [], 
    isLoading: isRewardsLoading,
    error: rewardsError,
    refetch: refetchRewardsQuery
  } = useQuery({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Use React Query for reward usage data
  const { 
    data: rewardUsage = {}, 
    isLoading: isUsageLoading,
    error: usageError,
    refetch: refetchUsageQuery
  } = useQuery({
    queryKey: ['rewardUsage'],
    queryFn: fetchRewardUsage,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Combined loading state
  const isLoading = isRewardsLoading || isUsageLoading;

  // Handle errors
  useEffect(() => {
    if (rewardsError) {
      console.error('Error loading rewards:', rewardsError);
      toast({
        title: "Error loading rewards",
        description: "Could not load rewards from the database.",
        variant: "destructive",
      });
    }

    if (usageError) {
      console.error('Error loading reward usage data:', usageError);
    }
  }, [rewardsError, usageError, toast]);

  // Save points to localStorage when they change
  useEffect(() => {
    localStorage.setItem(POINTS_STORAGE_KEY, totalPoints.toString());
  }, [totalPoints]);

  // Check if we need to reset the weekly tracking
  useEffect(() => {
    const lastResetKey = 'lastWeeklyReset';
    const lastReset = localStorage.getItem(lastResetKey);
    const now = new Date();
    const currentWeek = `${now.getFullYear()}-${now.getMonth() + 1}-${Math.floor(now.getDate() / 7)}`;
    
    if (lastReset !== currentWeek) {
      // Reset weekly tracking
      localStorage.setItem(lastResetKey, currentWeek);
      queryClient.invalidateQueries({ queryKey: ['rewardUsage'] });
    }
  }, [queryClient]);

  // Get the current day of week (0-6, Sunday-Saturday)
  const getCurrentDayOfWeek = () => {
    return new Date().getDay();
  };

  // Get current week number
  const getCurrentWeek = () => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${Math.floor(now.getDate() / 7)}`;
  };

  // Combined refetch function
  const refetchRewards = async () => {
    console.log("Manually refetching rewards and usage data");
    await Promise.all([
      refetchRewardsQuery(),
      refetchUsageQuery()
    ]);
  };

  // Handle buying a reward
  const handleBuy = async (index: number) => {
    const reward = rewards[index];
    
    // Check if user has enough points
    if (totalPoints >= reward.cost) {
      try {
        console.log("Buying reward:", reward.title);
        
        // Update the reward in Supabase
        const updatedSupply = reward.supply + 1;
        
        const { error } = await supabase
          .from('rewards')
          .update({ supply: updatedSupply })
          .eq('id', reward.id);
        
        if (error) {
          console.error("Error updating reward supply:", error);
          throw error;
        }
        
        // Update points locally
        setTotalPoints(totalPoints - reward.cost);
        
        // Invalidate the 'rewards' query to trigger a refetch
        await refetchRewards();
        
        toast({
          title: "Reward Purchased",
          description: `You purchased ${reward.title}`,
        });
      } catch (error) {
        console.error('Error buying reward:', error);
        
        toast({
          title: "Error",
          description: "Failed to purchase reward. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Not Enough Points",
        description: "You don't have enough points to buy this reward.",
        variant: "destructive",
      });
    }
  };

  // Handle using a reward
  const handleUse = async (index: number) => {
    const reward = rewards[index];
    
    // Check if the reward has any supply left
    if (reward.supply > 0) {
      try {
        console.log("Using reward:", reward.title);
        // Update the reward in Supabase
        const updatedSupply = reward.supply - 1;
        
        const { error: updateError } = await supabase
          .from('rewards')
          .update({ supply: updatedSupply })
          .eq('id', reward.id);
        
        if (updateError) {
          console.error("Error updating reward supply:", updateError);
          throw updateError;
        }
        
        // Update usage tracking for this reward
        const currentDay = getCurrentDayOfWeek();
        const currentWeek = getCurrentWeek();
        
        // Insert new usage record
        const { error: usageError } = await supabase
          .from('reward_usage')
          .insert({
            reward_id: reward.id,
            day_of_week: currentDay,
            used: true,
            week_number: currentWeek
          });
        
        if (usageError) {
          console.error("Error recording reward usage:", usageError);
          throw usageError;
        }
        
        // Invalidate the 'rewards' and 'rewardUsage' queries to trigger a refetch
        await refetchRewards();
        
        toast({
          title: "Reward Used",
          description: `You used ${reward.title}`,
        });
      } catch (error) {
        console.error('Error using reward:', error);
        
        toast({
          title: "Error",
          description: "Failed to use reward. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "No Supply",
        description: "You don't have any of this reward to use.",
        variant: "destructive",
      });
    }
  };

  // Get usage data for a specific reward
  const getRewardUsage = (index: number) => {
    const reward = rewards[index];
    if (!reward || !reward.id) return Array(7).fill(false);
    
    const rewardId = `reward-${reward.id}`;
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
      console.log("Preparing to save reward:", index !== null ? "edit existing" : "create new", rewardData);
      
      // Prepare the data object for Supabase
      const dataToSave = {
        title: rewardData.title,
        description: rewardData.description,
        cost: rewardData.cost,
        icon_name: rewardData.iconName,
        icon_color: rewardData.icon_color,
        background_image_url: rewardData.background_image_url,
        background_opacity: rewardData.background_opacity,
        focal_point_x: rewardData.focal_point_x,
        focal_point_y: rewardData.focal_point_y,
        highlight_effect: rewardData.highlight_effect,
        title_color: rewardData.title_color,
        subtext_color: rewardData.subtext_color,
        calendar_color: rewardData.calendar_color,
        updated_at: new Date().toISOString()
      };
      
      console.log("Data to save to Supabase:", dataToSave);
      
      if (index !== null) {
        // Updating existing reward
        const existingReward = rewards[index];
        console.log("Updating existing reward with ID:", existingReward.id);
        
        // Preserve the created_at timestamp when updating
        const { data, error } = await supabase
          .from('rewards')
          .update(dataToSave)
          .eq('id', existingReward.id)
          .select();
        
        if (error) {
          console.error("Supabase update error:", error);
          throw error;
        }
        
        console.log("Supabase update result:", data);
        
        toast({
          title: "Reward Updated",
          description: "The reward has been successfully updated.",
        });
      } else {
        // Adding new reward
        console.log("Creating new reward");
        const newRewardData = {
          ...dataToSave,
          supply: 0,  // New rewards start with 0 supply
          created_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
          .from('rewards')
          .insert(newRewardData)
          .select();
        
        if (error) {
          console.error("Supabase insert error:", error);
          throw error;
        }
        
        console.log("Supabase insert result:", data);
        
        toast({
          title: "Reward Created",
          description: "A new reward has been successfully created.",
        });
      }
      
      // Refetch the rewards data after saving
      await refetchRewards();
      
    } catch (error) {
      console.error('Error saving reward:', error);
      
      toast({
        title: "Error",
        description: "Failed to save reward. Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw to let the caller know it failed
    }
  };

  // Handle deleting a reward
  const handleDeleteReward = async (index: number) => {
    try {
      const rewardToDelete = rewards[index];
      console.log("Deleting reward:", rewardToDelete.title, "with ID:", rewardToDelete.id);
      
      // Delete from Supabase
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardToDelete.id);
      
      if (error) {
        console.error("Supabase delete error:", error);
        throw error;
      }
      
      console.log("Reward successfully deleted from Supabase");
      
      // Invalidate the 'rewards' query to trigger a refetch
      await refetchRewards();
      
      toast({
        title: "Reward Deleted",
        description: "The reward has been successfully deleted.",
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

  // Loading state representation during initial load
  if (isRewardsLoading && !rewards.length) {
    return <div className="text-white text-center p-4">Loading rewards...</div>;
  }

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
        isLoading,
        refetchRewards
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
