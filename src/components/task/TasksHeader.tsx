
import React, { useEffect } from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { Box, Coins } from 'lucide-react'; // Removed PlusCircle
import { usePointsManager } from '@/data/points/usePointsManager';
// Removed Button import

interface TasksHeaderProps {
  // onAddTask?: () => void; // Removed onAddTask prop
}

const TasksHeader: React.FC<TasksHeaderProps> = (/* Removed { onAddTask } */) => {
  const { 
    points: totalPoints, 
    domPoints, 
    isLoadingPoints, 
    refreshPoints,
  } = usePointsManager();

  useEffect(() => {
    refreshPoints();
  }, [refreshPoints]);

  const badgeStyle = { backgroundColor: "#000000", borderColor: "#00f0ff", borderWidth: "1px" };

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Tasks</h1> {/* Added mr-auto here to push badges to the right */}
      {/* Removed Add Task Button and onAddTask condition */}
      {isLoadingPoints ? (
        <span className="text-sm text-gray-400 ml-auto">Loading points...</span>
      ) : (
        <div className="flex items-center gap-2 ml-auto"> {/* Ensured ml-auto is still here if mr-auto on h1 is not enough */}
          <Badge 
            className="text-white font-bold px-3 py-1 flex items-center gap-1"
            style={badgeStyle}
          >
            <Coins className="w-3 h-3" />
            <span>{totalPoints}</span>
          </Badge>
          <DOMBadge icon="crown" value={domPoints} />
        </div>
      )}
    </div>
  );
};

export default TasksHeader;
