
import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import RewardCard from '../components/RewardCard';
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

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(POINTS_STORAGE_KEY, totalPoints.toString());
  }, [totalPoints]);

  useEffect(() => {
    localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(rewards));
  }, [rewards]);

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
              iconColor="#9b87f5"
              onBuy={() => handleBuy(index)}
              onUse={() => handleUse(index)}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Rewards;
