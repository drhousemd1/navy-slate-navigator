
import React, { useEffect } from 'react';
import { Badge } from '../ui/badge';
import { DOMBadge } from '../ui/dom-badge';
import { Box, Coins, PlusCircle } from 'lucide-react';
import { usePointsManager } from '@/data/points/usePointsManager';
import { Button } from '@/components/ui/button'; // Import Button

interface TasksHeaderProps { // Define props interface
  onAddTask?: () => void;
}

const TasksHeader: React.FC<TasksHeaderProps> = ({ onAddTask }) => { // Destructure onAddTask
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
      <h1 className="text-base font-semibold text-white mr-4">My Tasks</h1>
      {onAddTask && ( // Conditionally render button if onAddTask is provided
        <Button
          onClick={onAddTask}
          size="sm"
          className="bg-nav-active hover:bg-nav-active/90 text-white mr-auto"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      )}
      {isLoadingPoints ? (
        <span className="text-sm text-gray-400 ml-auto">Loading points...</span>
      ) : (
        <div className="flex items-center gap-2 ml-auto">
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
