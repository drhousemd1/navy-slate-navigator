
import React from 'react';
import TaskCard from '../TaskCard';
import { TaskWithId } from '@/data/tasks/types'; // Use TaskWithId
import EmptyState from '@/components/common/EmptyState';
import { ClipboardList, LoaderCircle, AlertTriangle, WifiOff } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
// import { Button } from '@/components/ui/button'; // Button not needed if action is removed

interface TasksListProps {
  tasks: TaskWithId[];
  isLoading: boolean; 
  onEditTask: (task: TaskWithId) => void;
  onToggleCompletion: (taskId: string, completed: boolean) => void;
  error?: Error | null;
  isUsingCachedData?: boolean;
  // onCreateTaskClick?: () => void; // Removed
}

const TasksList: React.FC<TasksListProps> = ({ 
  tasks, 
  isLoading,
  onEditTask,
  onToggleCompletion,
  error,
  isUsingCachedData
  // onCreateTaskClick // Removed
}) => {
  // Only show toast for cached data once
  React.useEffect(() => {
    if (isUsingCachedData) {
      toast({
        title: "Using cached data",
        description: "We're currently showing you cached tasks data due to connection issues.",
        variant: "default"
      });
    }
  }, [isUsingCachedData]);

  if (isLoading && tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <LoaderCircle className="h-10 w-10 text-primary animate-spin mb-2" />
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold mb-2">Error loading tasks</p>
        <p className="text-slate-400">{error.message}</p>
        <p className="text-slate-400 mt-4">We'll automatically retry loading your data.</p>
      </div>
    );
  }

  if (!isLoading && tasks.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="You currently have no tasks."
        description="Please create tasks using the dedicated button."
      />
    );
  }

  // Show a banner if using cached data but we have tasks to show
  const CachedDataBanner = isUsingCachedData && tasks.length > 0 ? (
    <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md flex items-center gap-2">
      <WifiOff className="h-5 w-5 text-amber-500" />
      <span className="text-sm">Showing cached data due to connection issues.</span>
    </div>
  ) : null;

  return (
    <>
      {CachedDataBanner}
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
    </>
  );
};

export default TasksList;
