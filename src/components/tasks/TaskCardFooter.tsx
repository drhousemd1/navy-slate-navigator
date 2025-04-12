
import React from 'react';

const TaskCardFooter = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative z-10 transition-opacity duration-[2000ms] flex justify-between items-center mt-auto pt-4 border-t border-light-navy">
      {children}
    </div>
  );
};

export default TaskCardFooter;
