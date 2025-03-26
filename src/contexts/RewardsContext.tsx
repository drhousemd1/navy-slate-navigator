
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

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
const REWARDS_STORAGE_KEY = 'rewardItems';
const REWARD_USAGE_STORAGE_KEY = 'rewardUsage';

// Maximum size for background image data URLs (in characters)
const MAX_IMAGE_SIZE = 100000; // Approximately 100KB

type RewardItem = {
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
  handleSaveReward: (rewardData: any, index: number | null) => void;
  handleDeleteReward: (index: number) => void;
  getRewardUsage: (index: number) => boolean[];
  getFrequencyCount: (index: number) => number;
}

const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

// Helper function to safely save to localStorage
const safeLocalStorageSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
    return false;
  }
};

// Helper function to get data from localStorage
const safeLocalStorageGetItem = (key: string, defaultValue: string): string => {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? value : defaultValue;
  } catch (error) {
    console.error(`Error retrieving from localStorage (${key}):`, error);
    return defaultValue;
  }
};

// Helper to process image URLs, limiting their size
const processImageUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  
  // If image URL is too large, don't store it
  if (url.length > MAX_IMAGE_SIZE) {
    console.warn('Image too large for localStorage, skipping storage');
    return undefined;
  }
  
  return url;
};

export const RewardsProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  // Initialize state with localStorage values or defaults
  const [totalPoints, setTotalPoints] = useState(() => {
    const savedPoints = safeLocalStorageGetItem(POINTS_STORAGE_KEY, '100');
    return parseInt(savedPoints, 10);
  });
  
  const [rewards, setRewards] = useState<RewardItem[]>(() => {
    const savedRewards = safeLocalStorageGetItem(REWARDS_STORAGE_KEY, JSON.stringify(initialRewards));
    try {
      return JSON.parse(savedRewards);
    } catch (error) {
      console.error('Error parsing rewards from localStorage:', error);
      return initialRewards;
    }
  });

  // Initialize the usage tracking state
  const [rewardUsage, setRewardUsage] = useState(() => {
    const savedUsage = safeLocalStorageGetItem(REWARD_USAGE_STORAGE_KEY, '{}');
    try {
      return JSON.parse(savedUsage);
    } catch (error) {
      console.error('Error parsing reward usage from localStorage:', error);
      return {};
    }
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    safeLocalStorageSetItem(POINTS_STORAGE_KEY, totalPoints.toString());
  }, [totalPoints]);

  useEffect(() => {
    try {
      // Process rewards to limit image size before saving
      const processedRewards = rewards.map(reward => ({
        ...reward,
        background_image_url: processImageUrl(reward.background_image_url)
      }));
      
      const rewardsString = JSON.stringify(processedRewards);
      safeLocalStorageSetItem(REWARDS_STORAGE_KEY, rewardsString);
    } catch (error) {
      console.error('Error saving rewards to localStorage:', error);
    }
  }, [rewards]);

  useEffect(() => {
    safeLocalStorageSetItem(REWARD_USAGE_STORAGE_KEY, JSON.stringify(rewardUsage));
  }, [rewardUsage]);

  // Check if we need to reset the weekly tracking
  useEffect(() => {
    const lastResetKey = 'lastWeeklyReset';
    const lastReset = safeLocalStorageGetItem(lastResetKey, '');
    const now = new Date();
    const currentWeek = `${now.getFullYear()}-${now.getMonth() + 1}-${Math.floor(now.getDate() / 7)}`;
    
    if (lastReset !== currentWeek) {
      // Reset weekly tracking
      safeLocalStorageSetItem(lastResetKey, currentWeek);
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
  const handleSaveReward = (rewardData: any, index: number | null) => {
    // Process image size limits
    const processedRewardData = {
      ...rewardData,
      background_image_url: processImageUrl(rewardData.background_image_url)
    };
    
    if (index !== null) {
      const updatedRewards = [...rewards];
      updatedRewards[index] = {
        ...rewards[index],
        ...processedRewardData
      };
      
      setRewards(updatedRewards);
    } else {
      // Add new reward
      setRewards([...rewards, processedRewardData]);
    }
  };

  // Handle deleting a reward
  const handleDeleteReward = (index: number) => {
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
        getFrequencyCount
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
