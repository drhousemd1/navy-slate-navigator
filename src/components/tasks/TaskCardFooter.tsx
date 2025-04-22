
import React from 'react';

interface TaskCardFooterProps {
  children: React.ReactNode;
}

const TaskCardFooter = ({ children }: TaskCardFooterProps) => {
  return (
    <div className="flex justify-between items-center mt-auto pt-4 border-t border-light-navy">
      {children}
    </div>
  );
};

export default TaskCardFooter;
