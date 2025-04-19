
import React from 'react';

const TaskIcon = ({ status }) => {
  return (
    <span className={`inline-block w-3 h-3 rounded-full ${status === 'done' ? 'bg-green-500' : 'bg-yellow-400'}`} />
  );
};

export default TaskIcon;
