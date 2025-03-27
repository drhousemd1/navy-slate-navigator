
import React from 'react';
import { Badge } from '../../components/ui/badge';
import { useRewards } from '../../contexts/RewardsContext';
import { Gift, Coins } from 'lucide-react';

const RewardsHeader: React.FC = () => {
  const { totalPoints, rewards } = useRewards();
  const totalRewards = rewards.reduce((total, reward) => total + reward.supply, 0);

  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-semibold text-white">My Rewards</h1>
      <div className="flex items-center gap-2">
        <Badge className="bg-green-500 text-white font-bold px-3 py-1 flex items-center gap-1">
          <Gift className="w-3 h-3" />
          <span>{totalRewards} Rewards</span>
        </Badge>
        <Badge className="bg-nav-active text-white font-bold px-3 py-1 flex items-center gap-1">
          <Coins className="w-3 h-3" />
          <span>{totalPoints}</span>
        </Badge>
      </div>
    </div>
  );
};

export default RewardsHeader;
