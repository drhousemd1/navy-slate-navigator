
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { saveTasksToDB } from '@/data/indexedDB/useIndexedDB';
import { Task } from '@/lib/taskUtils';
import { toast } from '@/hooks/use-toast';

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, string>({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) {
        toast({
          title: 'Error Deleting Task',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }
      return taskId;
    },
    onSuccess: async (deletedTaskId) => {
      // Optimistically update the cache
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']) || [];
      const updatedTasks = previousTasks.filter(task => task.id !== deletedTaskId);
      queryClient.setQueryData(['tasks'], updatedTasks);

      // Update IndexedDB
      await saveTasksToDB(updatedTasks);

      toast({
        title: 'Task Deleted',
        description: 'The task has been successfully deleted.',
      });
    },
    onError: (error) => {
      // Toast is handled in mutationFn for specific Supabase errors,
      // this is a fallback or for other types of errors.
      console.error('Error deleting task:', error.message);
      toast({
        title: 'Deletion Failed',
        description: 'Could not delete the task. Please try again.',
        variant: 'destructive',
      });
      // Optionally, refetch or revert optimistic update if needed
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
