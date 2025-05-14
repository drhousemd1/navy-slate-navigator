
import React from 'react';
import TaskCard from '../TaskCard';
import { Task } from '@/lib/taskUtils';

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
  // Only show loading state if there's no cached data
  if (isLoading && tasks.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-white mb-4">Loading tasks...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-white mb-4">No tasks found. Create your first task!</p>
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
