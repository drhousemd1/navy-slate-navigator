
import React from 'react';
import TaskCard from '../TaskCard';
import { TaskWithId } from '@/data/tasks/types';
import { StandardLoading, StandardError, StandardEmpty } from '@/components/common/StandardizedStates';
import { sortTasksByPriorityAndDate } from '@/lib/taskSorting';

interface TasksListProps {
  tasks: TaskWithId[];
  isLoading: boolean; 
  onEditTask: (task: TaskWithId) => void;
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

  // Sort tasks by priority and date
  const sortedTasks = sortTasksByPriorityAndDate(tasks);

  return (
    <div className="space-y-4 overflow-x-hidden w-full max-w-full">
      {sortedTasks.map((task) => {
        const frequency = task.frequency as 'daily' | 'weekly';
        const usageDataArray = Array.isArray(task.usage_data) ? task.usage_data : Array(7).fill(0);
        return (
          <div key={task.id} className="w-full max-w-full overflow-x-hidden">
            <TaskCard
              title={task.title}
              description={task.description || ''}
              points={task.points}
              completed={task.completed}
              backgroundImage={task.background_image_url}
              backgroundOpacity={task.background_opacity}
              focalPointX={task.focal_point_x}
              focalPointY={task.focal_point_y}
              frequency={frequency}
              frequency_count={task.frequency_count}
              usage_data={usageDataArray}
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
          </div>
        );
      })}
    </div>
  );
};

export default TasksList;
