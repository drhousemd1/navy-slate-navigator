
import React, { ReactNode } from 'react';

interface TaskCardHeaderProps {
  icon: ReactNode;
  title?: string;
}

const TaskCardHeader = ({ icon, title }: TaskCardHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="text-white text-xl flex items-center gap-2">
        {icon}
        {title && <span>{title}</span>}
      </div>
    </div>
  );
};

export default TaskCardHeader;
