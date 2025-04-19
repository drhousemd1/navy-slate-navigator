
import React from 'react';
import TaskEditorForm from './TaskEditorForm';

const TaskEditor = ({ isOpen, onClose, task }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded w-full max-w-xl shadow-lg relative">
        <button onClick={onClose} className="absolute top-2 right-3 text-gray-400">×</button>
        <TaskEditorForm task={task} onSubmit={onClose} />
      </div>
    </div>
  );
};

export default TaskEditor;
