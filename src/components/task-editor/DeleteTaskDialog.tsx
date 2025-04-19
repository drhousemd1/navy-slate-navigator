
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';

const DeleteTaskDialog = ({ taskId, onConfirm, onCancel }) => {
  const queryClient = useQueryClient();

  const handleDelete = () => {
    console.log('Deleted task', taskId);
    queryClient.invalidateQueries(['tasks']);
    onConfirm();
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <p>Are you sure you want to delete this task?</p>
      <div className="flex gap-4 mt-4">
        <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded">Yes</button>
        <button onClick={onCancel} className="border px-4 py-2 rounded">Cancel</button>
      </div>
    </div>
  );
};

export default DeleteTaskDialog;
