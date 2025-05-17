
import React from 'react';
import TaskCard from '../TaskCard';
import { Task } from '@/lib/taskUtils';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

interface TasksListProps {
  tasks: Task[];
  isLoading: boolean;
  onEditTask: (task: Task) => void;
  onToggleCompletion: (taskId: string, completed: boolean) => void;
}

const TaskCardSkeleton: React.FC = () => (
  <div className="p-4 rounded-lg shadow-md bg-slate-800 border border-slate-700 space-y-3">
    <div className="flex justify-between items-start">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-5 w-12" />
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <div className="flex justify-between items-center pt-2">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  </div>
);

const TasksList: React.FC<TasksListProps> = ({ 
  tasks, 
  isLoading,
  onEditTask,
  onToggleCompletion 
}) => {
  if (isLoading && tasks.length === 0) {
    return (
      <div className="space-y-4">
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    );
  }

  if (!isLoading && tasks.length === 0) { // Added !isLoading check for clarity
    return (
      <div className="text-center py-10">
        <p className="text-white mb-4">No tasks found. Create your first task!</p>
        {/* Optionally, add a button or suggestion to create a task here */}
      </div>
    );
  }

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

