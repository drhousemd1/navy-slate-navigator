import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Task,
  fetchTasks,
  saveTask,
  updateTaskCompletion,
  deleteTask,
  getCurrentDayOfWeek,
  wasCompletedToday
} from '@/lib/taskUtils';

const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
});

/**
 * Provides the tasks query that fetches all tasks from Supabase
 */
export const useTasksQuery = () => {
  const queryClient = useQueryClient();

  persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 1000 * 60 * 20 // Persisted data valid for 20 minutes
  });

  return useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    staleTime: 1000 * 60 * 20, // 20 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (replace cacheTime with gcTime)
    refetchOnWindowFocus: false
  });
};

/**
 * Provides a hook to handle task completion toggling with optimistic updates
 */
export const useToggleTaskCompletion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string, completed: boolean }) => {
      const task = queryClient.getQueryData<Task[]>(['tasks'])?.find(t => t.id === taskId);
      if (!task) {
        throw new Error("Task not found");
      }

      const dayOfWeek = getCurrentDayOfWeek();
      const currentUsage = task.usage_data ? [...task.usage_data] : Array(7).fill(0);
      const maxCompletions = task.frequency_count || 1;

      if (currentUsage[dayOfWeek] >= maxCompletions && completed) {
        toast({
          title: 'Maximum completions reached',
          description: 'You have already completed this task the maximum number of times today.',
          variant: 'default',
        });
        return null;
      }

      const optimisticUsage = [...currentUsage];
      optimisticUsage[dayOfWeek] = completed 
        ? Math.min(optimisticUsage[dayOfWeek] + 1, maxCompletions) 
        : Math.max(optimisticUsage[dayOfWeek] - 1, 0);
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ usage_data: optimisticUsage })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ taskId, completed }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);
      
      // Find the current task
      const currentTask = previousTasks?.find(t => t.id === taskId);
      if (!currentTask) return { previousTasks };
      
      // Calculate the updated usage_data
      const dayOfWeek = getCurrentDayOfWeek();
      const currentUsage = currentTask.usage_data ? [...currentTask.usage_data] : Array(7).fill(0);
      const maxCompletions = currentTask.frequency_count || 1;
      
      if (currentUsage[dayOfWeek] >= maxCompletions && completed) {
        return { previousTasks };
      }
      
      const optimisticUsage = [...currentUsage];
      optimisticUsage[dayOfWeek] = completed 
        ? Math.min(optimisticUsage[dayOfWeek] + 1, maxCompletions) 
        : Math.max(optimisticUsage[dayOfWeek] - 1, 0);
      
      // Optimistically update the task
      queryClient.setQueryData<Task[]>(['tasks'], (old = []) => 
        old.map(task => 
          task.id === taskId 
            ? { 
                ...task, 
                usage_data: optimisticUsage,
                completed: optimisticUsage[dayOfWeek] > 0
              } 
            : task
        )
      );
      
      // Return a context object with the snapshot
      return { previousTasks };
    },
    onError: (err, { taskId }, context) => {
      console.error('Error toggling task completion:', err);
      toast({
        title: 'Error',
        description: 'Failed to update task. Please try again.',
        variant: 'destructive',
      });
      
      // If there's a snapshot, roll back to it
      if (context?.previousTasks) {
        queryClient.setQueryData<Task[]>(['tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      // Always invalidate the tasks query after a completion toggle
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
};

/**
 * Provides a hook to save (create or update) a task with optimistic updates
 */
export const useSaveTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: saveTask,
    onMutate: async (taskData: Task) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);
      
      // Optimistically update the tasks list
      queryClient.setQueryData<Task[]>(['tasks'], (old = []) => {
        if (taskData.id) {
          // Update existing task
          return old.map(task => task.id === taskData.id ? { ...task, ...taskData } : task);
        } else {
          // Add new task with temporary ID
          const newTask = { 
            ...taskData, 
            id: `temp-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            usage_data: Array(7).fill(0) // Initialize usage_data
          };
          return [newTask, ...old];
        }
      });
      
      return { previousTasks };
    },
    onError: (err, taskData, context) => {
      console.error('Error saving task:', err);
      toast({
        title: 'Error',
        description: 'Failed to save task. Please try again.',
        variant: 'destructive',
      });
      
      if (context?.previousTasks) {
        queryClient.setQueryData<Task[]>(['tasks'], context.previousTasks);
      }
    },
    onSuccess: (savedTask) => {
      toast({
        title: 'Success',
        description: `Task ${savedTask?.id ? 'updated' : 'created'} successfully!`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
};

/**
 * Provides a hook to delete a task with optimistic updates
 */
export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteTask,
    onMutate: async (taskId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);
      
      // Optimistically remove the task from the list
      queryClient.setQueryData<Task[]>(['tasks'], (old = []) => 
        old.filter(task => task.id !== taskId)
      );
      
      return { previousTasks };
    },
    onError: (err, taskId, context) => {
      console.error('Error deleting task:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete task. Please try again.',
        variant: 'destructive',
      });
      
      if (context?.previousTasks) {
        queryClient.setQueryData<Task[]>(['tasks'], context.previousTasks);
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Task deleted successfully!',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
};

/**
 * Provides a hook to check for daily task resets
 */
export const useTaskResetChecker = () => {
  const queryClient = useQueryClient();
  
  const checkForReset = () => {
    const tasks = queryClient.getQueryData<Task[]>(['tasks']) || [];
    
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
  
  return { checkForReset };
};
