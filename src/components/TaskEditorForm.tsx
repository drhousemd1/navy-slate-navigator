
import React, { useState } from 'react';

const TaskEditorForm = ({ task, onSubmit }) => {
  const [title, setTitle] = useState(task?.title || '');
  const [status, setStatus] = useState(task?.status || 'pending');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Save', { title, status });
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border px-2 py-1" />
      </div>
      <div className="mt-2">
        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border px-2 py-1">
          <option value="pending">Pending</option>
          <option value="done">Done</option>
        </select>
      </div>
      <button type="submit" className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Save</button>
    </form>
  );
};

export default TaskEditorForm;
