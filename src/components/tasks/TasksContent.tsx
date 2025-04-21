
import React, { useState, useEffect } from 'react';
import TaskCard from '../TaskCard';
import TaskEditor from '../TaskEditor';
import TasksHeader from '../task/TasksHeader';
import { useRewards } from '@/contexts/RewardsContext';
import { useTaskCarousel } from '@/contexts/TaskCarouselContext';
import { Task, getCurrentDayOfWeek } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { 
  useTasksQuery, 
  useToggleTaskCompletion, 
  useSaveTask, 
  useDeleteTask,
  useTaskResetChecker
} from '@/data/TasksDataHandler';

interface TasksContentProps {
  isEditorOpen: boolean;
  setIsEditorOpen: (isOpen: boolean) => void;
}

const TasksContent: React.FC<TasksContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const { refreshPointsFromDatabase } = useRewards();
  const { carouselTimer, setCarouselTimer, globalCarouselIndex } = useTaskCarousel();
  const { checkForReset } = useTaskResetChecker();

  // Query hooks
  const { data: tasks = [], isLoading, error } = useTasksQuery();
  
  // Mutation hooks
  const saveTaskMutation = useSaveTask();
  const deleteTaskMutation = useDeleteTask();
  const toggleCompletionMutation = useToggleTaskCompletion();

  useEffect(() => {
    // Check for tasks that need to be reset (e.g., daily tasks at midnight)
    checkForReset();

    const scheduleMidnightCheck = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      console.log('Time until midnight check:', timeUntilMidnight, 'ms');

      const timeout = setTimeout(() => {
        console.log('Midnight reached, checking tasks for reset');
        checkForReset();
        scheduleMidnightCheck(); // Schedule the next check
      }, timeUntilMidnight);

      return timeout;
    };

    const timeoutId = scheduleMidnightCheck();
    return () => clearTimeout(timeoutId);
  }, [checkForReset]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tasks. Please try again.',
        variant: 'destructive',
      });
    }
  }, [error]);

  const handleNewTask = () => {
    console.log("Creating new task");
    setCurrentTask(null);
    setIsEditorOpen(true);
  };

  const handleEditTask = (task: Task) => {
    console.log("Editing task:", task);
    setCurrentTask(task);
    setIsEditorOpen(true);
  };

  const handleSaveTask = async (taskData: Task) => {
    try {
      console.log("Saving task:", taskData);
      await saveTaskMutation.mutateAsync(taskData);
      
      // Fix this line - properly update carousel timer if present
      if (taskData.carousel_timer && typeof taskData.carousel_timer === 'number') {
        setCarouselTimer(taskData.carousel_timer);
      }
      
      setIsEditorOpen(false);
      setCurrentTask(null);
    } catch (err) {
      console.error('Error in handleSaveTask:', err);
      // Error is already handled in the mutation
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      console.log("Deleting task:", taskId);
      await deleteTaskMutation.mutateAsync(taskId);
      
      setCurrentTask(null);
      setIsEditorOpen(false);
    } catch (err) {
      console.error('Error in handleDeleteTask:', err);
      // Error is already handled in the mutation
    }
  };

  const handleToggleCompletion = async (taskId: string, completed: boolean) => {
    try {
      const result = await toggleCompletionMutation.mutateAsync({ taskId, completed });
      
      if (result && completed) {
        await refreshPointsFromDatabase();
      }
    } catch (err) {
      console.error("Error in handleToggleCompletion:", err);
      // Error is already handled in the mutation
    }
  };

  return (
    <div className="p-4 pt-6">
      <TasksHeader />

      {isLoading ? (
        <div className="text-white">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-light-navy mb-4">No tasks found. Create your first task to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => {
            const usageDataForTask = task.usage_data || Array(7).fill(0);
            const currentDayOfWeek = getCurrentDayOfWeek();
            const currentCompletions = usageDataForTask[currentDayOfWeek] || 0;

            return (
              <TaskCard
                key={task.id}
                title={task.title}
                description={task.description}
                points={task.points}
                completed={task.completed}
                backgroundImage={task.background_image_url}
                backgroundOpacity={task.background_opacity}
                focalPointX={task.focal_point_x}
                focalPointY={task.focal_point_y}
                frequency={task.frequency}
                frequency_count={task.frequency_count}
                usage_data={usageDataForTask}
                icon_url={task.icon_url}
                icon_name={task.icon_name}
                priority={task.priority}
                highlight_effect={task.highlight_effect}
                title_color={task.title_color}
                subtext_color={task.subtext_color}
                calendar_color={task.calendar_color}
                icon_color={task.icon_color}
                onEdit={() => handleEditTask(task)}
                onToggleCompletion={(completed) => handleToggleCompletion(task.id, completed)}
                backgroundImages={task.background_images}
                sharedImageIndex={globalCarouselIndex}
              />
            );
          })}
        </div>
      )}

      <TaskEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setCurrentTask(null);
        }}
        taskData={currentTask || undefined}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
};

export default TasksContent;
