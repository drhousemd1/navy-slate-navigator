import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import RewardCard from '../components/RewardCard';
import RewardEditor from '../components/RewardEditor';
import { Badge } from '../components/ui/badge';

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

const Rewards: React.FC = () => {
  // Initialize state with localStorage values or defaults
  const [totalPoints, setTotalPoints] = useState(() => {
    const savedPoints = localStorage.getItem(POINTS_STORAGE_KEY);
    return savedPoints ? parseInt(savedPoints, 10) : 100;
  });
  
  const [rewards, setRewards] = useState(() => {
    const savedRewards = localStorage.getItem(REWARDS_STORAGE_KEY);
    return savedRewards ? JSON.parse(savedRewards) : initialRewards;
  });

  // Initialize the usage tracking state
  const [rewardUsage, setRewardUsage] = useState(() => {
    const savedUsage = localStorage.getItem(REWARD_USAGE_STORAGE_KEY);
    return savedUsage ? JSON.parse(savedUsage) : {};
  });

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentReward, setCurrentReward] = useState<any>(null);
  const [currentRewardIndex, setCurrentRewardIndex] = useState<number | null>(null);

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

  // Handle editing a reward
  const handleEdit = (index: number) => {
    setCurrentReward(rewards[index]);
    setCurrentRewardIndex(index);
    setIsEditorOpen(true);
  };

  // Handle saving edited reward
  const handleSaveReward = (rewardData: any) => {
    if (currentRewardIndex !== null) {
      const updatedRewards = [...rewards];
      updatedRewards[currentRewardIndex] = {
        ...rewards[currentRewardIndex],
        ...rewardData
      };
      
      setRewards(updatedRewards);
    }
  };

  // Handle deleting a reward
  const handleDeleteReward = (index: number) => {
    if (index !== null) {
      const updatedRewards = rewards.filter((_, i) => i !== index);
      setRewards(updatedRewards);
      setIsEditorOpen(false);
      setCurrentReward(null);
      setCurrentRewardIndex(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 pt-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-white">My Rewards</h1>
          <Badge className="bg-nav-active text-white font-bold px-3 py-1">
            {totalPoints} Points
          </Badge>
        </div>
        
        <div className="space-y-4">
          {rewards.map((reward, index) => (
            <RewardCard
              key={index}
              title={reward.title}
              description={reward.description}
              cost={reward.cost}
              supply={reward.supply}
              iconName={reward.iconName}
              iconColor={reward.icon_color || "#9b87f5"}
              onBuy={() => handleBuy(index)}
              onUse={() => handleUse(index)}
              onEdit={() => handleEdit(index)}
              backgroundImage={reward.background_image_url}
              backgroundOpacity={reward.background_opacity}
              focalPointX={reward.focal_point_x}
              focalPointY={reward.focal_point_y}
              highlight_effect={reward.highlight_effect}
              title_color={reward.title_color}
              subtext_color={reward.subtext_color}
              calendar_color={reward.calendar_color}
              usageData={getRewardUsage(index)}
              frequencyCount={getFrequencyCount(index)}
            />
          ))}
        </div>
      </div>
      
      <RewardEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setCurrentReward(null);
          setCurrentRewardIndex(null);
        }}
        rewardData={currentReward}
        onSave={handleSaveReward}
        onDelete={handleDeleteReward}
      />
    </AppLayout>
  );
};

export default Rewards;
