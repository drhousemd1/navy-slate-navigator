
import React from 'react';

const TasksHeader = ({ onCreate }) => (
  <div className="flex justify-between items-center">
    <h2 className="text-2xl font-bold">Tasks</h2>
    <button onClick={onCreate} className="bg-blue-600 text-white px-4 py-2 rounded">New Task</button>
  </div>
);

export default TasksHeader;
