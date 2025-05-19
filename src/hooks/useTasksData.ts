
import { useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Task } from '@/lib/taskUtils';
import { TaskWithId, CreateTaskVariables, UpdateTaskVariables } from '@/data/tasks/types';
import { useTasksQuery } from '@/data/tasks/queries';
import { 
  useCreateTask, 
  useUpdateTask, 
  useDeleteTask, 
  useToggleTaskCompletionMutation 
} from '@/data/tasks/mutations';
import { supabase } from '@/integrations/supabase/client'; // For user ID if needed for create

export const useTasksData = () => {
  const queryClient = useQueryClient();

  const { 
    data: tasks = [], 
    isLoading, 
    error, 
    refetch: refetchTasksQuery 
  } = useTasksQuery();

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const toggleCompletionMutation = useToggleTaskCompletionMutation();

  const saveTask = async (taskData: Partial<TaskWithId>): Promise<TaskWithId | null> => {
    try {
      if (taskData.id) {
        // Update existing task
        const updateVariables: UpdateTaskVariables = { 
          id: taskData.id, 
          ...taskData 
        };
        const updatedTask = await updateTaskMutation.mutateAsync(updateVariables);
        return updatedTask;
      } else {
        // Create new task
        // Ensure all required fields for CreateTaskVariables are present
        if (!taskData.title || typeof taskData.points !== 'number') {
            toast({
                title: "Missing required fields",
                description: "Title and points are required to create a task.",
                variant: "destructive"
            });
            return null;
        }
        const createVariables: CreateTaskVariables = {
            title: taskData.title,
            points: taskData.points,
            description: taskData.description,
            frequency: taskData.frequency || 'daily',
            frequency_count: taskData.frequency_count || 1,
            priority: taskData.priority || 'medium',
            icon_name: taskData.icon_name,
            icon_color: taskData.icon_color,
            title_color: taskData.title_color,
            subtext_color: taskData.subtext_color,
            calendar_color: taskData.calendar_color,
            background_image_url: taskData.background_image_url,
            background_opacity: taskData.background_opacity,
            highlight_effect: taskData.highlight_effect,
            focal_point_x: taskData.focal_point_x,
            focal_point_y: taskData.focal_point_y,
            week_identifier: taskData.week_identifier,
            background_images: taskData.background_images,
            icon_url: taskData.icon_url,
            usage_data: taskData.usage_data,
        };
        const newTask = await createTaskMutation.mutateAsync(createVariables);
        return newTask;
      }
    } catch (err) {
      console.error('Error saving task:', err);
      // Toast is handled by the individual mutation hooks
      return null;
    }
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    try {
      await deleteTaskMutation.mutateAsync(taskId);
      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      return false;
    }
  };

  const toggleTaskCompletion = async (taskId: string, completed: boolean, pointsValue: number): Promise<boolean> => {
    try {
      const task = tasks.find(t => t.id === taskId);
      await toggleCompletionMutation.mutateAsync({ taskId, completed, pointsValue, task });
      return true;
    } catch (err) {
      console.error('Error toggling task completion:', err);
      return false;
    }
  };
  
  const refetchTasks = async (): Promise<QueryObserverResult<Task[], Error>> => {
    return refetchTasksQuery();
  };

  return {
    tasks: tasks as TaskWithId[], // Cast to TaskWithId as mutations and queries now use it
    isLoading,
    error,
    saveTask,
    deleteTask,
    toggleTaskCompletion,
    refetchTasks,
  };
};
