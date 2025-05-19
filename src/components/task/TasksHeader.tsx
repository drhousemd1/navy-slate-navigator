
import React, { useEffect } from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { Box, Coins } from 'lucide-react';
import { usePointsManager } from '@/data/points/usePointsManager';
import { useRewards } from '@/contexts/RewardsContext'; // Added import for useRewards

interface TasksHeaderProps {
  // onAddTask?: () => void; // Removed onAddTask prop
}

const TasksHeader: React.FC<TasksHeaderProps> = () => {
  const { 
    points: totalPoints, 
    domPoints, 
    isLoadingPoints, 
    refreshPoints,
  } = usePointsManager();

  const { totalRewardsSupply, totalDomRewardsSupply } = useRewards(); // Get supply data from RewardsContext

  useEffect(() => {
    refreshPoints();
  }, [refreshPoints]);

  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Tasks</h1>
      {isLoadingPoints ? (
        <span className="text-sm text-gray-400 ml-auto">Loading points...</span>
      ) : (
        <div className="flex items-center gap-2 ml-auto">
          <Badge 
            className="text-white font-bold px-3 py-1 flex items-center gap-1"
            style={badgeStyle}
          >
            <Box className="w-3 h-3" /> {/* Icon for total rewards supply */}
            <span>{totalRewardsSupply}</span>
          </Badge>
          <Badge 
            className="text-white font-bold px-3 py-1 flex items-center gap-1"
            style={badgeStyle}
          >
            <Coins className="w-3 h-3" />
            <span>{totalPoints}</span>
          </Badge>
          <DOMBadge icon="box" value={totalDomRewardsSupply} /> {/* DOMBadge for DOM rewards supply */}
          <DOMBadge icon="crown" value={domPoints} />
        </div>
      )}
    </div>
  );
};

export default TasksHeader;
