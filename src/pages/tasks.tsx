
import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTasksData } from '@/data/TasksDataHandler';
import { Loader2 } from 'lucide-react';

const TasksPage = () => {
  const { tasks, isLoading } = useTasksData();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold mb-6">Tasks</h1>
      
      {tasks.length === 0 ? (
        <div className="text-center p-8 bg-slate-800 rounded-lg">
          <p className="text-gray-400">You don't have any tasks yet.</p>
          <p className="text-gray-400">Create your first task to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className="bg-slate-800 rounded-lg p-4 border border-slate-700"
            >
              <h3 className="font-semibold mb-2">{task.title}</h3>
              <p className="text-sm text-gray-400 mb-3">{task.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">
                  {task.priority}
                </span>
                <span className="text-xs text-gray-400">
                  Points: {task.points}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
};

export default TasksPage;
