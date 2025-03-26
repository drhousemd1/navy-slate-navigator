
import React from 'react';
import AppLayout from '../components/AppLayout';
import RewardCard from '../components/RewardCard';

const Rewards: React.FC = () => {
  // Static local rewards data
  const exampleRewards = [
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

  return (
    <AppLayout>
      <div className="p-4 pt-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-white">My Rewards</h1>
        </div>
        
        <div className="space-y-4">
          {exampleRewards.map((reward, index) => (
            <RewardCard
              key={index}
              title={reward.title}
              description={reward.description}
              cost={reward.cost}
              supply={reward.supply}
              iconName={reward.iconName}
              iconColor="#9b87f5"
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Rewards;
