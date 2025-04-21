
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import AppLayout from '../components/AppLayout';
import TaskCard from '../components/TaskCard';
import TaskEditor from '../components/TaskEditor';
import TasksHeader from '../components/task/TasksHeader';
import { RewardsProvider, useRewards } from '../contexts/RewardsContext';
import { TaskCarouselProvider, useTaskCarousel } from '../contexts/TaskCarouselContext';
import { 
  fetchTasks, 
  Task, 
  saveTask, 
  updateTaskCompletion, 
  deleteTask,
  getLocalDateString,
  wasCompletedToday
} from '../lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TasksContentProps {
  isEditorOpen: boolean;
  setIsEditorOpen: (isOpen: boolean) => void;
}

const TasksContent: React.FC<TasksContentProps> = ({ isEditorOpen, setIsEditorOpen }) => {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();
  const { refreshPointsFromDatabase } = useRewards();

  const [localUsageData, setLocalUsageData] = useState<{[taskId: string]: number[]}>({});

  const { carouselTimer, globalCarouselIndex } = useTaskCarousel();

  const { data: tasks = [], isLoading, error, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    staleTime: 10000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  useEffect(() => {
    const checkForReset = () => {
      const now = new Date();
      console.log('Checking for task reset. Current local time:', now.toLocaleTimeString());

      if (tasks.length > 0) {
        const tasksToReset = tasks.filter(task => 
          task.completed && 
          task.frequency === 'daily' && 
          !wasCompletedToday(task)
        );

        if (tasksToReset.length > 0) {
          console.log('Found tasks that need to be reset:', tasksToReset.length);
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      }
    };

    checkForReset();

    const scheduleMidnightCheck = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      console.log('Time until midnight check:', timeUntilMidnight, 'ms');

      return setTimeout(() => {
        console.log('Midnight reached, checking tasks');
        queryClient.invalidateQueries({ queryKey: ['tasks'] });

        const newTimeout = scheduleMidnightCheck();
        return () => clearTimeout(newTimeout);
      }, timeUntilMidnight);
    };

    const timeoutId = scheduleMidnightCheck();

    return () => clearTimeout(timeoutId);
  }, [queryClient, tasks]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tasks. Please try again.',
        variant: 'destructive',
      });
    }
  }, [error]);

  useEffect(() => {
    if (tasks.length > 0) {
      const newLocalUsageData: {[taskId: string]: number[]} = {};
      tasks.forEach(task => {
        newLocalUsageData[task.id] = task.usage_data ? [...task.usage_data] : Array(7).fill(0);
      });
      setLocalUsageData(newLocalUsageData);
    }
  }, [tasks]);

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
      const savedTask = await saveTask(taskData);

      if (savedTask) {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast({
          title: 'Success',
          description: `Task ${currentTask ? 'updated' : 'created'} successfully!`,
        });
        setIsEditorOpen(false);
      }
    } catch (err) {
      console.error('Error saving task:', err);
      toast({
        title: 'Error',
        description: 'Failed to save task. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      console.log("Deleting task:", taskId);
      const success = await deleteTask(taskId);

      if (success) {
        setCurrentTask(null);
        setIsEditorOpen(false);
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast({
          title: 'Success',
          description: 'Task deleted successfully!',
        });
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete task. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const toggleCompletionMutation = useMutation({
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) => updateTaskCompletion(taskId, completed),
    onSuccess: async (updatedTask) => {
      if (!updatedTask) {
        toast({
          title: 'Error',
          description: 'Failed to update task completion due to backend rejection.',
          variant: 'destructive',
        });
        return;
      }

      // Update the query cache for tasks replacing the updated task
      queryClient.setQueryData<Task[]>(['tasks'], (oldTasks) => {
        if (!oldTasks) return [];
        return oldTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
      });

      // Update local usage data state
      if (updatedTask.usage_data) {
        setLocalUsageData((prev) => ({
          ...prev,
          [updatedTask.id]: updatedTask.usage_data,
        }));
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['task-completions'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });

      if (updatedTask.completed) {
        await refreshPointsFromDatabase();
      }
    },
    onError: (err) => {
      console.error('Error toggling task completion:', err);
      toast({
        title: 'Error',
        description: 'Failed to update task. Please try again.',
        variant: 'destructive',
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const handleToggleCompletion = (taskId: string, completed: boolean) => {
    const currentUsage = localUsageData[taskId] ? [...localUsageData[taskId]] : Array(7).fill(0);
    const dayOfWeek = new Date().getDay();
    const currentCount = currentUsage[dayOfWeek] || 0;

    // Prevent exceeding max completions on local UI side before mutation
    if (completed && currentCount >= 1) {
      console.log(`Task ${taskId} already at max completions locally`);
      return;
    }
    // Optimistically update local usage data immediately for responsiveness
    if (completed) {
      currentUsage[dayOfWeek] = currentCount + 1;
    } else {
      currentUsage[dayOfWeek] = Math.max(currentCount - 1, 0);
    }
    setLocalUsageData((prev) => ({
      ...prev,
      [taskId]: currentUsage,
    }));

    toggleCompletionMutation.mutate({ taskId, completed });
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
            const usageDataForTask = localUsageData[task.id] || task.usage_data || Array(7).fill(0);
            const currentDayOfWeek = new Date().getDay();
            const currentCompletions = usageDataForTask[currentDayOfWeek] || 0;
            const maxCompletions = task.frequency_count || 1;

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

const Tasks: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleNewTask = () => {
    console.log("Parent component triggering new task");
    setIsEditorOpen(true);
  };

  return (
    <AppLayout onAddNewItem={handleNewTask}>
      <TaskCarouselProvider>
        <RewardsProvider>
          <TasksContent 
            isEditorOpen={isEditorOpen}
            setIsEditorOpen={setIsEditorOpen}
          />
        </RewardsProvider>
      </TaskCarouselProvider>
    </AppLayout>
  );
};

export default Tasks;

