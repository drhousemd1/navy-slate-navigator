
import React from 'react';
import AppLayout from '../components/AppLayout';
import TaskCard from '../components/TaskCard';

const Tasks: React.FC = () => {
  return (
    <AppLayout>
      <div className="p-4 pt-6">
        <h1 className="text-2xl font-semibold text-white mb-6">My Tasks</h1>
        
        {/* Example task */}
        <TaskCard
          title="Reading"
          description="Read for at least 20 minutes"
          points={5}
        />
      </div>
    </AppLayout>
  );
};

export default Tasks;
