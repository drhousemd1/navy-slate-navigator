import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Task, 
  saveTask, 
  updateTaskCompletion, 
  deleteTask,
  wasCompletedToday
} from '@/lib/taskUtils';

// Keys for React Query cache
const TASKS_KEY = 'tasks';
const TASK_COMPLETIONS_KEY = 'task-completions';

// Fetch all tasks
export const fetchTasks = async (): Promise<Task[]> => {
  try {
    const { data, error } = await getSupabaseClient()
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error fetching tasks',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
    
    const processedTasks = (data as Task[]).map(task => {
      if (!task.usage_data) {
        task.usage_data = Array(7).fill(0);
      }
      
      if (task.completed && task.frequency === 'daily' && !wasCompletedToday(task)) {
        return { ...task, completed: false };
      }
      return task;
    });
    
    return processedTasks;
  } catch (err) {
    console.error('Unexpected error fetching tasks:', err);
    toast({
      title: 'Error fetching tasks',
      description: 'Could not fetch tasks',
      variant: 'destructive',
    });
    return [];
  }
};

// Main hook for task operations
export const useTasksQuery = () => {
  const queryClient = useQueryClient();
  
  // Query for fetching all tasks
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch: refetchTasks
  } = useQuery({
    queryKey: [TASKS_KEY],
    queryFn: fetchTasks,
    staleTime: 10000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Mutation for saving a task (create or update)
  const saveTaskMutation = useMutation({
    mutationFn: saveTask,
    onSuccess: (savedTask) => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
      toast({
        title: 'Success',
        description: `Task ${savedTask?.id ? 'updated' : 'created'} successfully!`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save task. Please try again.',
        variant: 'destructive',
      });
    }
  });

  // Mutation for toggling task completion
  const toggleCompletionMutation = useMutation({
    mutationFn: ({ taskId, completed }: { taskId: string, completed: boolean }) => 
      updateTaskCompletion(taskId, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
      queryClient.invalidateQueries({ queryKey: [TASK_COMPLETIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-metrics-summary'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'points'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update task. Please try again.',
        variant: 'destructive',
      });
    }
  });

  // Mutation for deleting a task
  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
      toast({
        title: 'Success',
        description: 'Task deleted successfully!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete task. Please try again.',
        variant: 'destructive',
      });
    }
  });

  return {
    tasks,
    isLoading,
    error: error ? (error as Error) : null,
    saveTask: (taskData: Partial<Task>) => saveTaskMutation.mutateAsync(taskData),
    toggleCompletion: (taskId: string, completed: boolean) => 
      toggleCompletionMutation.mutateAsync({ taskId, completed }),
    deleteTask: (taskId: string) => deleteTaskMutation.mutateAsync(taskId),
    refetchTasks
  };
};
