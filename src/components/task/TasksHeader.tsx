
import React from 'react';
import PointsBubbles from '../common/PointsBubbles';

interface TasksHeaderProps {
  onCreateTask?: () => void;
}

const TasksHeader: React.FC<TasksHeaderProps> = ({ onCreateTask }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">Tasks</h1>
      <PointsBubbles />
    </div>
  );
};

export default TasksHeader;
