
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import TaskCard from '../components/TaskCard';
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
}

const Tasks: React.FC = () => {
  const { toast } = useToast();
  
  // Sample initial tasks
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Reading',
      description: 'Read for at least 20 minutes',
      points: 5,
      completed: false
    }
  ]);

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    toast({
      title: "Task deleted",
      description: "The task has been successfully deleted.",
      variant: "default",
    });
  };

  return (
    <AppLayout>
      <div className="p-4 pt-6">
        <h1 className="text-2xl font-semibold text-white mb-6">My Tasks</h1>
        
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            title={task.title}
            description={task.description}
            points={task.points}
            completed={task.completed}
            onDelete={() => handleDeleteTask(task.id)}
          />
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center text-nav-inactive py-8">
            No tasks available. Add a new task to get started.
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Tasks;
