
import React from 'react';
import AppLayout from '../components/AppLayout';
import TaskCard from '../components/TaskCard';
import { Edit } from 'lucide-react';

const Tasks: React.FC = () => {
  return (
    <AppLayout>
      <div className="p-4 pt-6">
        <div className="flex items-center mb-6">
          <h1 className="text-2xl font-semibold text-white mr-2">My Tasks</h1>
          <Edit className="w-5 h-5 text-nav-active" />
        </div>
        
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
