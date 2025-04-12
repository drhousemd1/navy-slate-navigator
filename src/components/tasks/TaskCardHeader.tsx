
import React from 'react';

const TaskCardHeader = ({ icon }: { icon: string }) => {
  return (
    <div className="flex items-center justify-between mb-2 relative z-10">
      <div className="text-white text-xl">{icon}</div>
    </div>
  );
};

export default TaskCardHeader;
