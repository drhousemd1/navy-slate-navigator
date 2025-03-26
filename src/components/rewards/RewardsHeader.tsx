
import React from 'react';
import { Badge } from '../../components/ui/badge';
import { useRewards } from '../../contexts/RewardsContext';

const RewardsHeader: React.FC = () => {
  const { totalPoints } = useRewards();

  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-semibold text-white">My Rewards</h1>
      <Badge className="bg-nav-active text-white font-bold px-3 py-1">
        {totalPoints} Points
      </Badge>
    </div>
  );
};

export default RewardsHeader;
