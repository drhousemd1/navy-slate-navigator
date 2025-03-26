
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

export const RewardsProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  // Initialize state with localStorage values or defaults
  const [totalPoints, setTotalPoints] = useState(() => {
    const savedPoints = localStorage.getItem(POINTS_STORAGE_KEY);
    return savedPoints ? parseInt(savedPoints, 10) : 100; // Reset to 100 for testing
  });
  
  const [rewards, setRewards] = useState<RewardItem[]>(() => {
    const savedRewards = localStorage.getItem(REWARDS_STORAGE_KEY);
    return savedRewards ? JSON.parse(savedRewards) : initialRewards;
  });

  // Initialize the usage tracking state
  const [rewardUsage, setRewardUsage] = useState(() => {
    const savedUsage = localStorage.getItem(REWARD_USAGE_STORAGE_KEY);
    return savedUsage ? JSON.parse(savedUsage) : {};
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(POINTS_STORAGE_KEY, totalPoints.toString());
  }, [totalPoints]);

  useEffect(() => {
    localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(rewards));
  }, [rewards]);

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
    if (index !== null) {
      const updatedRewards = [...rewards];
      updatedRewards[index] = {
        ...rewards[index],
        ...rewardData
      };
      
      setRewards(updatedRewards);
    } else {
      // Add new reward
      setRewards([...rewards, rewardData]);
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
