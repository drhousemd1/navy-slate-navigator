
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import React, { useEffect } from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { Box, Coins } from 'lucide-react';
import { usePointsManager } from '@/data/points/usePointsManager';
import { useRewards } from '@/contexts/RewardsContext'; 

interface TasksHeaderProps {
  // onAddTask prop was already correctly removed from here.
  taskCount: number; 
  completedCount: number;
}

const TasksHeader: React.FC<TasksHeaderProps> = ({ taskCount, completedCount }) => { 
  const { 
    points: totalPoints, 
    domPoints, 
    refreshPoints,
  } = usePointsManager(); 

  const { totalRewardsSupply, totalDomRewardsSupply } = useRewards();

  useEffect(() => {
    refreshPoints();
  }, [refreshPoints]);

  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Tasks</h1>
      {/* Removed the direct display of task counts, if this was intended by UI design */}
      {/* <span className="text-sm text-gray-400 mr-4">{completedCount}/{taskCount} Tasks</span> */}
      <div className="flex items-center gap-2 ml-auto">
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
    </div>
  );
};

export default TasksHeader;

