
import React from 'react';
import { useRewards } from '../../contexts/RewardsContext';
import RewardCard from './RewardCard'; // Corrected import path

interface RewardsListProps {
  onEdit: (index: number) => void; // Keep onEdit to pass the original index for editing
}

const RewardsList: React.FC<RewardsListProps> = ({ onEdit }) => {
  const { rewards, isLoading } = useRewards();
  
  console.log("[RewardsList] Rendering with rewards:", rewards);

  if (!isLoading && (!rewards || rewards.length === 0)) {
    return (
      <div className="text-center p-10 animate-fade-in">
        <p className="text-light-navy mb-4">You don't have any rewards yet.</p>
        <p className="text-light-navy">Click the + button to create your first reward!</p>
      </div>
    );
  }
  
  if (!rewards) {
    // This state should ideally not be reached if preloading and persistent queries work.
    // It acts as a fallback.
    return null; 
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {rewards.map((reward, index) => (
        <RewardCard
          key={reward.id}
          reward={reward} // Pass the whole reward object as per patch
          onEdit={() => onEdit(index)} // Pass onEdit with original index
        />
      ))}
    </div>
  );
};

export default RewardsList;
