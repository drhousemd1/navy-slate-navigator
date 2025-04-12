
import React from 'react';

const TaskCardFooter = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex justify-between items-center mt-auto pt-4 border-t border-light-navy relative z-10">
      {children}
    </div>
  );
};

export default TaskCardFooter;
