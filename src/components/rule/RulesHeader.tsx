
import React, { useEffect } from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { Box, Coins } from 'lucide-react';
import { useRewards } from '@/contexts/RewardsContext';
// import { useProfilePoints } from "@/data/queries/useProfilePoints"; // Remove this
import { usePointsManager } from '@/data/points/usePointsManager'; // Add this

const RulesHeader: React.FC = () => {
  const { totalRewardsSupply, totalDomRewardsSupply, refreshPointsFromDatabase } = useRewards();
  // const { data: profile } = useProfilePoints(); // Remove this
  const { points: totalPoints, domPoints, isLoadingPoints, refreshPoints } = usePointsManager(); // Use this

  // Refresh points when component mounts - using refreshPoints from usePointsManager
  useEffect(() => {
    // refreshPointsFromDatabase(); // This was from useRewards, let's use the one from usePointsManager
    refreshPoints(); // From usePointsManager
  }, [refreshPoints]);

  // Style for badges - black background with cyan border
  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">Rules</h1>
      {isLoadingPoints ? (
        <span className="text-sm text-gray-400">Loading points...</span>
      ) : (
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
          <DOMBadge icon="box" value={totalDomRewardsSupply} />
          <DOMBadge icon="crown" value={domPoints} />
        </div>
      )}
    </div>
  );
};

export default RulesHeader;
