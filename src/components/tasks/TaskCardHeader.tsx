
import React from 'react';

const TaskCardHeader = ({ icon }: { icon: string }) => {
  return (
    <div className="relative z-10 flex items-center justify-between mb-2">
      <div className="text-white text-xl">{icon}</div>
    </div>
  );
};

export default TaskCardHeader;
