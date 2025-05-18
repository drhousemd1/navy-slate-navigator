
import React, { useEffect } from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
// import { useRewards } from '../../contexts/RewardsContext'; // Remove this
import { Box, Coins } from 'lucide-react';
// import { useProfilePoints } from "@/data/queries/useProfilePoints"; // Remove this
import { usePointsManager } from '@/data/points/usePointsManager'; // Add this

const TasksHeader: React.FC = () => {
  // const { totalRewardsSupply, totalDomRewardsSupply, refreshPointsFromDatabase } = useRewards(); // Remove this
  // const { data: profile } = useProfilePoints(); // Remove this
  // const totalPoints = profile?.points ?? 0; // Remove this
  // const domPoints = profile?.dom_points ?? 0; // Remove this

  const { 
    points: totalPoints, 
    domPoints, 
    isLoadingPoints, 
    refreshPoints,
    // We need totalRewardsSupply and totalDomRewardsSupply from somewhere else if they are still needed.
    // For now, let's assume they are not critical for this header or will be sourced differently.
    // If they are needed, we'd have to integrate another hook or pass them as props.
    // For simplicity, I am removing them from this header as they are not directly related to user points.
    // totalRewardsSupply and totalDomRewardsSupply typically come from rewards data, not user profile points.
  } = usePointsManager();


  // Refresh points when component mounts
  useEffect(() => {
    // refreshPointsFromDatabase(); // Remove this
    refreshPoints(); // Use this from usePointsManager
  }, [refreshPoints]);

  // Style for badges - black background with cyan border
  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Tasks</h1>
      {isLoadingPoints ? (
        <span className="text-sm text-gray-400">Loading points...</span>
      ) : (
        <div className="flex items-center gap-2">
          {/* <Badge 
            className="text-white font-bold px-3 py-1 flex items-center gap-1"
            style={badgeStyle}
          >
            <Box className="w-3 h-3" />
            <span>{totalRewardsSupply}</span>  // This was removed, see comment above
          </Badge> */}
          <Badge 
            className="text-white font-bold px-3 py-1 flex items-center gap-1"
            style={badgeStyle}
          >
            <Coins className="w-3 h-3" />
            <span>{totalPoints}</span>
          </Badge>
          {/* <DOMBadge icon="box" value={totalDomRewardsSupply} /> // This was removed, see comment above */}
          <DOMBadge icon="crown" value={domPoints} />
        </div>
      )}
    </div>
  );
};

export default TasksHeader;
