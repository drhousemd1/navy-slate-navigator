import { useCoreTextClasses } from '@/components/common/useCoreTextClasses';

import React from 'react';
import PointsBubbles from '../common/PointsBubbles';

interface TasksHeaderProps {
  onCreateTask?: () => void;
}

const TasksHeader: React.FC<TasksHeaderProps> = ({ onCreateTask }) => {
  const text = useCoreTextClasses();
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <h1 className={`text-base font-semibold ${text.primary} mr-auto`}>Tasks</h1>
      <PointsBubbles />
    </div>
  );
};

export default TasksHeader;
