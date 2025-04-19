
import React, { useEffect, useState } from 'react';

const TaskCard = ({ task, onEdit, lazyLoadLogic }) => {
  const [showLogic, setShowLogic] = useState(!lazyLoadLogic);

  useEffect(() => {
    if (lazyLoadLogic) {
      const t = setTimeout(() => setShowLogic(true), 300);
      return () => clearTimeout(t);
    }
  }, [lazyLoadLogic]);

  return (
    <div className="bg-white shadow rounded p-4">
      <h3 className="text-lg font-bold">{task.title}</h3>
      {task.image_url && (
        <img src={task.image_url} alt="" className="w-full h-32 object-cover mt-2 rounded" />
      )}
      <p>Status: {task.status}</p>
      {showLogic && (
        <div className="mt-3 flex gap-2">
          <button onClick={onEdit} className="text-blue-600 hover:underline">Edit</button>
          <button className="text-green-600 hover:underline">Toggle</button>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
