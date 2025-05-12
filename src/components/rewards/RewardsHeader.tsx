
import React, { useEffect } from 'react';
import { Badge } from '../../components/ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { useRewards } from '../../contexts/RewardsContext';
import { Box, Coins } from 'lucide-react';

const RewardsHeader: React.FC = () => {
  const { totalPoints, totalRewardsSupply, totalDomRewardsSupply, domPoints = 0, refreshPointsFromDatabase } = useRewards();

  // Refresh points when component mounts
  useEffect(() => {
    console.log("RewardsHeader mounted, refreshing points from database");
    refreshPointsFromDatabase();
  }, [refreshPointsFromDatabase]);

  // Style for badges - black background with cyan border
  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };
  
  // Style for DOM badges - black background with red border
  const domBadgeStyle = { backgroundColor: "#000000", borderColor: "#ea384c", borderWidth: "1px" };

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Rewards</h1>
      <div className="flex items-center gap-2">
        <Badge 
          className="text-white font-bold px-3 py-1 flex items-center gap-1"
          style={badgeStyle}
        >
          <Box className="w-3 h-3" />
          <span>{totalRewardsSupply}</span>
        </Badge>
        <Badge 
          className="text-white font-bold px-3 py-1 flex items-center gap-1"
          style={badgeStyle}
        >
          <Coins className="w-3 h-3" />
          <span>{totalPoints}</span>
        </Badge>
        <Badge
          className="text-white font-bold px-3 py-1 flex items-center gap-1"
          style={domBadgeStyle}
        >
          <Box className="w-3 h-3" />
          <span>{totalDomRewardsSupply}</span>
        </Badge>
        <Badge
          className="text-white font-bold px-3 py-1 flex items-center gap-1"
          style={domBadgeStyle}
        >
          <Coins className="w-3 h-3" />
          <span>{domPoints}</span>
        </Badge>
      </div>
    </div>
  );
};

export default RewardsHeader;
