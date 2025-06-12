
import React from 'react';
import TaskCard from '../TaskCard';
import { Task } from '@/data/tasks/types';
import { StandardLoading, StandardError, StandardEmpty } from '@/components/common/StandardizedStates';

interface TasksListProps {
  tasks: Task[];
  isLoading: boolean; 
  onEditTask: (task: Task) => void;
  onToggleCompletion: (taskId: string, completed: boolean) => void;
  error?: Error | null;
  isUsingCachedData?: boolean;
}

const TasksList: React.FC<TasksListProps> = ({ 
  tasks, 
  isLoading,
  onEditTask,
  onToggleCompletion,
  error,
  isUsingCachedData
}) => {

  if (isLoading && tasks.length === 0) {
    return <StandardLoading />;
  }

  if (error && tasks.length === 0) {
    return <StandardError />;
  }

  if (!isLoading && tasks.length === 0) {
    return <StandardEmpty />;
  }

  return (
    <div className="space-y-4 overflow-x-hidden w-full max-w-full">
      {tasks.map((task) => (
        <div key={task.id} className="w-full max-w-full overflow-x-hidden">
          <TaskCard
            task={task}
            onEdit={() => onEditTask(task)}
            onToggleComplete={(taskId) => onToggleCompletion(taskId, !task.completed)}
          />
        </div>
      ))}
    </div>
  );
};

export default TasksList;
