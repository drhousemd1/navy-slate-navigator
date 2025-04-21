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
  wasCompletedToday,
  getCurrentDayOfWeek // Ensure getCurrentDayOfWeek is imported
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

  // Fetch tasks using React Query
  const { data: tasks = [], isLoading, error, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    staleTime: 10000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Effect for daily task reset checks
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
          // Invalidate tasks query to trigger refetch and reset completed status
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      }
    };

    checkForReset(); // Initial check on mount

    // Schedule a check precisely at midnight
    const scheduleMidnightCheck = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      console.log('Time until midnight check:', timeUntilMidnight, 'ms');

      return setTimeout(() => {
        console.log('Midnight reached, checking tasks for reset');
        queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Refetch tasks at midnight

        // Reschedule for the next midnight
        const newTimeout = scheduleMidnightCheck();
        return () => clearTimeout(newTimeout); // Cleanup function for timeout
      }, timeUntilMidnight);
    };

    const timeoutId = scheduleMidnightCheck();

    // Cleanup timeout on component unmount
    return () => clearTimeout(timeoutId);
  }, [queryClient, tasks]); // Rerun effect if queryClient or tasks change

  // Effect to handle errors during task fetching
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tasks. Please try again.',
        variant: 'destructive',
      });
    }
  }, [error]); // Rerun effect if error changes

  // Effect to initialize local usage data when tasks are loaded or changed
  useEffect(() => {
    // Load local usage data from local storage
    const storedUsageData = localStorage.getItem('localUsageData');
    let initialUsageData: {[taskId: string]: number[]} = {};
    if (storedUsageData) {
      try {
        initialUsageData = JSON.parse(storedUsageData);
      } catch (e) {
        console.error("Failed to parse localUsageData from localStorage", e);
        // Handle the error, e.g., by clearing the invalid data
        localStorage.removeItem('localUsageData');
      }
    }

    if (tasks.length > 0) {
      const newLocalUsageData: {[taskId: string]: number[]} = {};
      tasks.forEach(task => {
        const taskId = task.id;
        const backendUsageData = task.usage_data || Array(7).fill(0);
        const localStorageUsageData = initialUsageData[taskId] || Array(7).fill(0);
        const currentDayOfWeek = getCurrentDayOfWeek();

        // Merge backend and local storage data, prioritizing local storage for the current day
        const mergedUsageData = backendUsageData.map((value, index) => {
          return index === currentDayOfWeek ? localStorageUsageData[index] !== undefined ? localStorageUsageData[index] : value : value;
        });

        newLocalUsageData[taskId] = mergedUsageData;
      });
      setLocalUsageData(newLocalUsageData);
    }
  }, [tasks]); // Rerun effect if tasks array changes

  // Effect to save local usage data to local storage
  useEffect(() => {
    localStorage.setItem('localUsageData', JSON.stringify(localUsageData));
  }, [localUsageData]); // Rerun effect if localUsageData changes

  // Handler to open editor for a new task
  const handleNewTask = () => {
    console.log("Creating new task");
    setCurrentTask(null); // No current task
    setIsEditorOpen(true);
  };

  // Handler to open editor for an existing task
  const handleEditTask = (task: Task) => {
    console.log("Editing task:", task);
    setCurrentTask(task);
    setIsEditorOpen(true);
  };

  // Handler to save a new or existing task
  const handleSaveTask = async (taskData: Task) => {
    try {
      console.log("Saving task:", taskData);
      const savedTask = await saveTask(taskData); // Call utility function to save

      if (savedTask) {
        // Invalidate tasks query to refetch the updated list
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast({
          title: 'Success',
          description: `Task ${currentTask ? 'updated' : 'created'} successfully!`,
        });
        setIsEditorOpen(false); // Close editor on success
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

  // Handler to delete a task
  const handleDeleteTask = async (taskId: string) => {
    try {
      console.log("Deleting task:", taskId);
      const success = await deleteTask(taskId); // Call utility function to delete

      if (success) {
        setCurrentTask(null);
        setIsEditorOpen(false);
        // Invalidate tasks query to refetch the list without the deleted task
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

  // Mutation for toggling task completion status
  const toggleCompletionMutation = useMutation({
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
      updateTaskCompletion(taskId, completed), // Calls the backend update function

    onSuccess: async (updatedTask) => {
      // Handle the case where the backend rejected the update (e.g., max completions reached)
      if (!updatedTask) {
        toast({
          title: 'Update Failed',
          description: 'Failed to update task completion. Max completions may be reached.', // More informative message
          variant: 'destructive',
        });
        // Optionally, refetch tasks to ensure UI consistency after rejection
         queryClient.invalidateQueries({ queryKey: ['tasks'] });
        return;
      }

      // --- **FIX APPLIED HERE** ---
      // Update the React Query cache with the confirmed data from the backend
      queryClient.setQueryData<Task[]>(['tasks'], (oldTasks) => {
        if (!oldTasks) return [];
        return oldTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task
        );
      });

      // Update local usage data state based on the confirmed backend data
      // This ensures local state matches the cache/backend after success
      if (updatedTask.usage_data) {
        setLocalUsageData((prev) => ({
          ...prev,
          [updatedTask.id]: updatedTask.usage_data,
        }));
      }

      // Invalidate related queries that depend on task completion data
      queryClient.invalidateQueries({ queryKey: ['task-completions'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });

      // Refresh user points if the task was marked as completed
      if (updatedTask.completed) { // Check the *returned* completed status
        await refreshPointsFromDatabase();
      }
    },
    onError: (err) => {
      // Handle network or unexpected backend errors
      console.error('Error toggling task completion:', err);
      toast({
        title: 'Error',
        description: 'Failed to update task. Please try again.',
        variant: 'destructive',
      });
      // Refetch tasks to revert optimistic updates if the mutation failed
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  // Handler called when the completion button is clicked
  const handleToggleCompletion = (taskId: string, completed: boolean) => {
    // Find the specific task from the current list in state/cache
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        console.error("Task not found for toggle:", taskId);
        return; // Should not happen normally
    }

    const currentUsage = localUsageData[taskId] ? [...localUsageData[taskId]] : Array(7).fill(0);
    const dayOfWeek = getCurrentDayOfWeek(); // Use imported utility function
    const currentCount = currentUsage[dayOfWeek] || 0;
    // --- **FIX APPLIED HERE** ---
    const maxCompletions = task.frequency_count || 1; // Get max completions from the task object

    // Prevent triggering mutation if max completions already reached (local check)
    if (completed && currentCount >= maxCompletions) {
      console.log(`Task ${taskId} already at max completions locally (${currentCount}/${maxCompletions})`);
      // Show a toast here as well, as the backend rejection toast won't fire
      toast({
        title: 'Maximum completions reached',
        description: 'You have already completed this task the maximum number of times today.',
        variant: 'default',
      });
      return;
    }

    // Optimistically update local usage data *before* calling the mutation
    // This makes the UI feel more responsive
    const optimisticUsage = [...currentUsage];
    if (completed) {
      optimisticUsage[dayOfWeek] = currentCount + 1;
    } else {
      // Logic for 'un-completing' if needed (currently not supported by button)
      // optimisticUsage[dayOfWeek] = Math.max(currentCount - 1, 0);
    }
    setLocalUsageData((prev) => ({
      ...prev,
      [taskId]: optimisticUsage,
    }));

    // Call the mutation to update the backend
    toggleCompletionMutation.mutate({ taskId, completed });
  };

  // Render the main content of the Tasks page
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
        // Render the list of tasks
        <div className="space-y-4">
          {tasks.map(task => {
            // Get usage data for the specific task, defaulting if necessary
            const usageDataForTask = localUsageData[task.id] || task.usage_data || Array(7).fill(0);
            const currentDayOfWeek = getCurrentDayOfWeek();
            const currentCompletions = usageDataForTask[currentDayOfWeek] || 0;

            return (
              <TaskCard
                key={task.id}
                title={task.title}
                description={task.description}
                points={task.points}
                completed={task.completed} // Pass the confirmed completed status
                backgroundImage={task.background_image_url}
                backgroundOpacity={task.background_opacity}
                focalPointX={task.focal_point_x}
                focalPointY={task.focal_point_y}
                frequency={task.frequency}
                frequency_count={task.frequency_count}
                usage_data={usageDataForTask} // Pass potentially updated local usage data
                icon_url={task.icon_url}
                icon_name={task.icon_name}
                priority={task.priority}
                highlight_effect={task.highlight_effect}
                title_color={task.title_color}
                subtext_color={task.subtext_color}
                calendar_color={task.calendar_color}
                icon_color={task.icon_color}
                onEdit={() => handleEditTask(task)}
                // Pass the handler function to the TaskCard
                onToggleCompletion={(completed) => handleToggleCompletion(task.id, completed)}
                backgroundImages={task.background_images}
                sharedImageIndex={globalCarouselIndex}
              />
            );
          })}
        </div>
      )}

      {/* Task Editor Modal */}
      <TaskEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setCurrentTask(null); // Clear current task when closing
        }}
        taskData={currentTask || undefined} // Pass task data if editing
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
};

// Main Tasks component wrapping the content with providers and layout
const Tasks: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Handler passed to AppLayout to trigger opening the editor for a new task
  const handleNewTask = () => {
    console.log("Parent component triggering new task");
    setIsEditorOpen(true);
  };

  return (
    <AppLayout onAddNewItem={handleNewTask}>
      <TaskCarouselProvider> {/* Provides carousel context */}
        <RewardsProvider> {/* Provides rewards context */}
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
