import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { saveTasksToDB } from '@/data/indexedDB/useIndexedDB';
import { Task } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, string, { previousTasks: Task[] | undefined }>({
    onMutate: async (deletedTaskId: string) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['tasks'] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // Optimistically update to the new value
      if (previousTasks) {
        const updatedTasks = previousTasks.filter(task => task.id !== deletedTaskId);
        queryClient.setQueryData<Task[]>(['tasks'], updatedTasks);
      }

      // Return a context object with the snapshotted value
      return { previousTasks };
    },
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) {
        // Toast for Supabase error is handled here, so UI doesn't show generic "Deletion Failed" immediately
        toast({
          title: 'Error Deleting Task',
          description: error.message,
          variant: 'destructive',
        });
        throw error; // Propagate error to trigger onError
      }
      return taskId; // Return the deleted task ID on success
    },
    onSuccess: async (deletedTaskId, variables, context) => {
      // The optimistic update is already applied.
      // Now, update IndexedDB since the server operation was successful.
      const currentTasks = queryClient.getQueryData<Task[]>(['tasks']) || [];
      try {
        await saveTasksToDB(currentTasks);
      } catch (indexedDbError) {
        logger.error('Failed to save tasks to IndexedDB after deletion:', indexedDbError);
        toast({
          title: 'Local Cache Error',
          description: 'Task deleted from server, but failed to update local cache.',
          variant: 'default', 
        });
      }

      toast({
        title: 'Task Deleted',
        description: 'The task has been successfully deleted.',
      });
    },
    onError: (error, deletedTaskId, context) => {
      // Rollback to the previous value if mutation fails
      if (context?.previousTasks) {
        queryClient.setQueryData<Task[]>(['tasks'], context.previousTasks);
      }
      // The toast for Supabase error is already shown in mutationFn.
      // This is a fallback or for other types of errors.
      // Avoid showing a generic "Deletion Failed" if a specific one was already shown.
      if (!error.message.includes('Error Deleting Task')) { // Prevent double toast if already handled
        toast({
          title: 'Deletion Failed',
          description: 'Could not delete the task. Please try again.',
          variant: 'destructive',
        });
      }
      logger.error('Error deleting task (from onError):', error.message);
    },
    onSettled: (data, error, deletedTaskId, context) => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
