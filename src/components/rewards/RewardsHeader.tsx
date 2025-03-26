
import React from 'react';
import { useRewards } from '../../contexts/RewardsContext';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';

interface RewardsHeaderProps {
  onAddNewReward?: () => void;
}

const RewardsHeader: React.FC<RewardsHeaderProps> = ({ onAddNewReward }) => {
  const { totalPoints } = useRewards();
  
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Rewards</h1>
        <p className="text-gray-300">
          You have <span className="font-bold text-purple-400">{totalPoints}</span> points to spend
        </p>
      </div>
      
      {onAddNewReward && (
        <Button 
          className="bg-nav-active text-white hover:bg-nav-active/90 flex items-center gap-2"
          onClick={onAddNewReward}
        >
          <Plus className="h-4 w-4" />
          New Reward
        </Button>
      )}
    </div>
  );
};

export default RewardsHeader;
