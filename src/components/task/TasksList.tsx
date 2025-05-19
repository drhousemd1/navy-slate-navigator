import React from 'react';
import TaskCard from '../TaskCard';
import { Task } from '@/lib/taskUtils';
import TaskCardSkeleton from '@/components/task/TaskCardSkeleton';
import EmptyState from '@/components/common/EmptyState';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TasksListProps {
  tasks: Task[];
  isLoading: boolean;
  onEditTask: (task: Task) => void;
  onToggleCompletion: (taskId: string, completed: boolean) => void;
  onCreateTaskClick?: () => void;
}

const TasksList: React.FC<TasksListProps> = ({ 
  tasks, 
  isLoading,
  onEditTask,
  onToggleCompletion,
  onCreateTaskClick 
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

  if (!isLoading && tasks.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No Tasks Yet"
        description="It looks like there are no tasks defined. Get started by creating your first one!"
        action={onCreateTaskClick && (
          <Button 
            onClick={onCreateTaskClick} 
            className="mt-4"
          >
            Create First Task
          </Button>
        )}
      />
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const frequency = task.frequency as 'daily' | 'weekly';
        return (
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
            frequency={frequency}
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
        );
      })}
    </div>
  );
};

export default TasksList;
