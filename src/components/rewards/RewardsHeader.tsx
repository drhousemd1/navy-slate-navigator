
import React, { useEffect } from 'react';
import { Badge } from '../../components/ui/badge';
import { useRewards } from '../../contexts/RewardsContext';
import { Box, Coins, Crown } from 'lucide-react';

const RewardsHeader: React.FC = () => {
  const { totalPoints, totalRewardsSupply, totalDomRewardsSupply, domPoints = 0, refreshPointsFromDatabase } = useRewards();

  // Refresh points when component mounts
  useEffect(() => {
    console.log("RewardsHeader mounted, refreshing points from database");
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Rewards</h1>
      <div className="flex items-center gap-2">
        <Badge className="bg-blue-500 text-white font-bold px-3 py-1 flex items-center gap-1">
          <Box className="w-3 h-3" />
          <span>{totalRewardsSupply}</span>
        </Badge>
        <Badge className="bg-cyan-500 text-white font-bold px-3 py-1 flex items-center gap-1">
          <Coins className="w-3 h-3" />
          <span>{totalPoints}</span>
        </Badge>
        <Badge variant="outline" className="dom-badge">
          <Box className="w-3 h-3" />
          <span>{totalDomRewardsSupply}</span>
        </Badge>
        <Badge variant="outline" className="dom-badge">
          <Crown className="w-3 h-3" />
          <span>{domPoints}</span>
        </Badge>
      </div>
    </div>
  );
};

export default RewardsHeader;
