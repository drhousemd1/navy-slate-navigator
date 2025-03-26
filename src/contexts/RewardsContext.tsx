
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  loading: boolean;
  handleBuy: (index: number) => void;
  handleUse: (index: number) => void;
  handleSaveReward: (rewardData: any, index: number | null) => Promise<void>;
  handleDeleteReward: (index: number) => void;
  getRewardUsage: (index: number) => boolean[];
  getFrequencyCount: (index: number) => number;
  refreshRewards: () => Promise<void>;
}

const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

export const RewardsProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const { toast } = useToast();
  
  // Initialize state with localStorage value for points
  const [totalPoints, setTotalPoints] = useState(() => {
    const savedPoints = localStorage.getItem(POINTS_STORAGE_KEY);
    return savedPoints ? parseInt(savedPoints, 10) : DEFAULT_POINTS;
  });
  
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize the usage tracking state
  const [rewardUsage, setRewardUsage] = useState<Record<string, boolean[]>>({});

  // Function to fetch rewards from Supabase
  const fetchRewards = async () => {
    try {
      setLoading(true);
      console.log("Fetching rewards from Supabase...");
      
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        // Map Supabase data to the format expected by the app
        const formattedRewards = data.map(reward => ({
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
          calendar_color: reward.calendar_color
        }));
        
        console.log("Rewards fetched successfully:", formattedRewards);
        setRewards(formattedRewards);
      } else {
        // Fallback to initial rewards if no data is found
        console.log("No rewards found, using initial rewards");
        setRewards(initialRewards);
      }
    } catch (err) {
      console.error('Error fetching rewards:', err);
      setError('Failed to load rewards. Using default values instead.');
      setRewards(initialRewards);
      
      toast({
        title: "Error loading rewards",
        description: "Could not load rewards from the database. Using default values instead.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh rewards - this can be called from outside components
  const refreshRewards = useCallback(async () => {
    await fetchRewards();
  }, []);

  // Fetch rewards on initial load
  useEffect(() => {
    fetchRewards();
  }, []);

  // Save points to localStorage when they change
  useEffect(() => {
    localStorage.setItem(POINTS_STORAGE_KEY, totalPoints.toString());
  }, [totalPoints]);

  // Fetch reward usage data whenever rewards change
  useEffect(() => {
    async function fetchRewardUsage() {
      try {
        // Get current week number
        const now = new Date();
        const currentWeek = `${now.getFullYear()}-${now.getMonth() + 1}-${Math.floor(now.getDate() / 7)}`;
        
        const { data, error } = await supabase
          .from('reward_usage')
          .select('*')
          .eq('week_number', currentWeek);
        
        if (error) {
          throw error;
        }
        
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
        
        setRewardUsage(usageMap);
      } catch (error) {
        console.error('Error fetching reward usage:', error);
        // Fallback to empty usage map
        setRewardUsage({});
      }
    }
    
    // Only fetch usage if we have rewards
    if (rewards.length > 0 && !loading) {
      fetchRewardUsage();
    }
  }, [rewards, loading]);

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

  // Get current week number
  const getCurrentWeek = () => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${Math.floor(now.getDate() / 7)}`;
  };

  // Handle buying a reward
  const handleBuy = async (index: number) => {
    const reward = rewards[index];
    
    // Check if user has enough points
    if (totalPoints >= reward.cost) {
      try {
        // Update the reward in Supabase
        const updatedSupply = reward.supply + 1;
        
        const { error } = await supabase
          .from('rewards')
          .update({ supply: updatedSupply })
          .eq('id', reward.id);
        
        if (error) {
          throw error;
        }
        
        // Update local state
        const updatedRewards = [...rewards];
        updatedRewards[index] = {
          ...reward,
          supply: updatedSupply
        };
        
        setRewards(updatedRewards);
        setTotalPoints(totalPoints - reward.cost);
        
        toast({
          title: "Reward Purchased",
          description: `You purchased ${reward.title}`,
          duration: 3000,
        });
      } catch (error) {
        console.error('Error buying reward:', error);
        
        toast({
          title: "Error",
          description: "Failed to purchase reward. Please try again.",
          variant: "destructive",
          duration: 3000,
        });
      }
    } else {
      toast({
        title: "Not Enough Points",
        description: "You don't have enough points to buy this reward.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Handle using a reward
  const handleUse = async (index: number) => {
    const reward = rewards[index];
    
    // Check if the reward has any supply left
    if (reward.supply > 0) {
      try {
        // Update the reward in Supabase
        const updatedSupply = reward.supply - 1;
        
        const { error: updateError } = await supabase
          .from('rewards')
          .update({ supply: updatedSupply })
          .eq('id', reward.id);
        
        if (updateError) {
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
          throw usageError;
        }
        
        // Update local states
        const updatedRewards = [...rewards];
        updatedRewards[index] = {
          ...reward,
          supply: updatedSupply
        };
        
        setRewards(updatedRewards);
        
        // Update the usage state
        const rewardId = `reward-${reward.id}`;
        const updatedUsage = { ...rewardUsage };
        
        if (!updatedUsage[rewardId]) {
          updatedUsage[rewardId] = Array(7).fill(false);
        }
        
        updatedUsage[rewardId][currentDay] = true;
        setRewardUsage(updatedUsage);
        
        toast({
          title: "Reward Used",
          description: `You used ${reward.title}`,
          duration: 3000,
        });
      } catch (error) {
        console.error('Error using reward:', error);
        
        toast({
          title: "Error",
          description: "Failed to use reward. Please try again.",
          variant: "destructive",
          duration: 3000,
        });
      }
    } else {
      toast({
        title: "No Supply",
        description: "You don't have any of this reward to use.",
        variant: "destructive",
        duration: 3000,
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
      console.log("Saving reward data:", rewardData, "at index:", index);
      
      if (index !== null) {
        // Updating existing reward
        const existingReward = rewards[index];
        console.log("Existing reward:", existingReward);
        
        const updateData = {
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
        
        console.log("Updating with data:", updateData);
        
        const { error } = await supabase
          .from('rewards')
          .update(updateData)
          .eq('id', existingReward.id);
        
        if (error) {
          throw error;
        }
        
        // Update local state with the combined data
        const updatedRewards = [...rewards];
        updatedRewards[index] = {
          ...existingReward,
          title: rewardData.title,
          description: rewardData.description,
          cost: rewardData.cost,
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
        
        console.log("Updated rewards array:", updatedRewards);
        setRewards(updatedRewards);
        
        toast({
          title: "Reward Updated",
          description: "The reward has been successfully updated.",
          duration: 3000,
        });
      } else {
        // Adding new reward
        console.log("Creating new reward");
        
        const insertData = {
          title: rewardData.title,
          description: rewardData.description,
          cost: rewardData.cost,
          supply: 0,  // New rewards start with 0 supply
          icon_name: rewardData.iconName,
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
        
        console.log("Inserting with data:", insertData);
        
        const { data, error } = await supabase
          .from('rewards')
          .insert(insertData)
          .select();
        
        if (error) {
          throw error;
        }
        
        // Add to local state with the returned ID
        if (data && data.length > 0) {
          console.log("Received data from insert:", data[0]);
          
          const newReward = {
            id: data[0].id,
            title: rewardData.title,
            description: rewardData.description,
            cost: rewardData.cost,
            supply: 0,
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
          
          const newRewards = [...rewards, newReward];
          console.log("Updated rewards array with new reward:", newRewards);
          setRewards(newRewards);
          
          toast({
            title: "Reward Created",
            description: "A new reward has been successfully created.",
            duration: 3000,
          });
        }
      }
      
      // Force a refresh of rewards after saving
      await fetchRewards();
      
    } catch (error) {
      console.error('Error saving reward:', error);
      
      toast({
        title: "Error",
        description: "Failed to save reward. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Handle deleting a reward
  const handleDeleteReward = async (index: number) => {
    try {
      const rewardToDelete = rewards[index];
      
      // Delete from Supabase
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardToDelete.id);
      
      if (error) {
        throw error;
      }
      
      // Remove from local state
      const updatedRewards = rewards.filter((_, i) => i !== index);
      setRewards(updatedRewards);
      
      // Also clean up the usage data
      const updatedUsage = { ...rewardUsage };
      delete updatedUsage[`reward-${rewardToDelete.id}`];
      setRewardUsage(updatedUsage);
      
      toast({
        title: "Reward Deleted",
        description: "The reward has been successfully deleted.",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error deleting reward:', error);
      
      toast({
        title: "Error",
        description: "Failed to delete reward. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  if (loading) {
    return <div className="text-white text-center p-4">Loading rewards...</div>;
  }

  return (
    <RewardsContext.Provider
      value={{
        totalPoints,
        rewards,
        rewardUsage,
        loading,
        handleBuy,
        handleUse,
        handleSaveReward,
        handleDeleteReward,
        getRewardUsage,
        getFrequencyCount,
        refreshRewards
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
