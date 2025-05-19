import React from 'react';
import TaskCard from '../TaskCard';
import { TaskWithId } from '@/data/tasks/types'; // Use TaskWithId
import EmptyState from '@/components/common/EmptyState';
import { ClipboardList } from 'lucide-react';
// import { Button } from '@/components/ui/button'; // Button not needed if action is removed

interface TasksListProps {
  tasks: TaskWithId[];
  isLoading: boolean; 
  onEditTask: (task: TaskWithId) => void;
  onToggleCompletion: (taskId: string, completed: boolean) => void;
  // onCreateTaskClick?: () => void; // Removed
}

const TasksList: React.FC<TasksListProps> = ({ 
  tasks, 
  isLoading,
  onEditTask,
  onToggleCompletion,
  // onCreateTaskClick // Removed
}) => {
  if (isLoading && tasks.length === 0) {
    return <div className="text-center py-10 text-slate-400">Loading tasks...</div>;
  }

  if (!isLoading && tasks.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="You currently have no tasks."
        description="Please create tasks using the dedicated button."
        // action prop removed
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
            usage_data={task.usage_data || []} // Ensure usage_data is an array
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
