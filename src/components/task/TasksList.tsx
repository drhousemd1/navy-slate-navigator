
import React from 'react';
import TaskCard from '../TaskCard';
import { Task } from '@/lib/taskUtils';
import { AlertCircle, ServerCrash, Loader2 } from 'lucide-react';

interface TasksListProps {
  tasks: Task[];
  isLoading: boolean;
  onEditTask: (task: Task) => void;
  onToggleCompletion: (taskId: string, completed: boolean) => void;
}

const TasksList: React.FC<TasksListProps> = ({ 
  tasks, 
  isLoading,
  onEditTask,
  onToggleCompletion 
}) => {
  if (isLoading) {
    return (
      <div className="text-center py-10">
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-cyan-500" />
        <p className="text-white mt-4">Loading tasks...</p>
      </div>
    );
  }

  // Network or server error indicator
  if (!tasks && !isLoading) {
    return (
      <div className="text-center py-10 space-y-4">
        <ServerCrash className="h-12 w-12 mx-auto text-red-400" />
        <div>
          <p className="text-white mb-2 font-semibold">Connection issue detected</p>
          <p className="text-gray-400">We're having trouble reaching the server.</p>
          <p className="text-gray-400">Please check your connection and try again.</p>
        </div>
      </div>
    );
  }

  // No tasks found
  if (tasks.length === 0) {
    return (
      <div className="text-center py-10 space-y-4">
        <AlertCircle className="h-12 w-12 mx-auto text-cyan-500" />
        <p className="text-white mb-4">No tasks found. Create your first task!</p>
      </div>
    );
  }

  // Display tasks
  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          title={task.title}
          description={task.description || ''}
          points={task.points}
          completed={task.completed}
          backgroundImage={task.background_image_url}
          backgroundOpacity={task.background_opacity}
          focalPointX={task.focal_point_x}
          focalPointY={task.focal_point_y}
          frequency={task.frequency}
          frequency_count={task.frequency_count}
          usage_data={task.usage_data}
          icon_url={task.icon_url}
          icon_name={task.icon_name}
          priority={task.priority}
          highlight_effect={task.highlight_effect}
          title_color={task.title_color}
          subtext_color={task.subtext_color}
          calendar_color={task.calendar_color}
          icon_color={task.icon_color}
          onEdit={() => onEditTask(task)}
          onToggleCompletion={(completed) => onToggleCompletion(task.id, completed)}
        />
      ))}
    </div>
  );
};

export default TasksList;
