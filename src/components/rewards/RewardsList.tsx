
import React from 'react';
import { useRewards } from '../../contexts/RewardsContext';
import { RewardCard } from '../RewardCard';

interface RewardsListProps {
  onEdit: (index: number) => void;
}

const RewardsList: React.FC<RewardsListProps> = ({ onEdit }) => {
  const { rewards, handleBuyReward, handleUseReward } = useRewards();
  
  if (!rewards || rewards.length === 0) {
    return (
      <div className="text-center p-10">
        <p className="text-light-navy mb-4">You don't have any rewards yet.</p>
        <p className="text-light-navy">Click the + button to create your first reward!</p>
      </div>
    );
  }

  // Enhanced debugging logs showing index and ID to track position stability
  console.log("[RewardsList] Rendering rewards list with stable order:", 
    rewards.map((r, i) => ({ 
      index: i, 
      id: r.id, 
      title: r.title, 
      created_at: r.created_at,
      updated_at: r.updated_at
    }))
  );

  return (
    <div className="flex flex-col gap-4">
      {rewards.map((reward, index) => (
        <RewardCard
          key={reward.id}
          reward={reward}
          onEdit={() => onEdit(index)}
          carouselIndex={index}
          onBuy={() => handleBuyReward(reward.id, reward.cost)}
          onUse={() => handleUseReward(reward.id)}
        />
      ))}
    </div>
  );
};

export default RewardsList;
