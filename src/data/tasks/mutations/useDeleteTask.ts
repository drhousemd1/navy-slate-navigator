
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
// import { Task } from '@/lib/taskUtils'; // Ensure correct Task import
import { Task } from '@/data/tasks/types'; // Use Task from types

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<Task, Error, string>({ // Changed TaskWithId to Task
    queryClient,
    queryKey: ['tasks'],
    mutationFn: async (taskId: string) => {
      // Also delete related task_completion_history records
      const { error: historyError } = await supabase
        .from('task_completion_history')
        .delete()
        .eq('task_id', taskId);

      if (historyError) {
        // Log or handle partial failure, but proceed with task deletion
        console.warn(`Failed to delete task history for task ${taskId}:`, historyError.message);
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      // No data is returned on successful delete
    },
    entityName: 'Task',
    idField: 'id',
    // If tasks have related data in other queries that need to be cleaned up optimistically,
    // specify `relatedQueryKey` and `relatedIdField` here.
    // For example, if there's a 'taskDetails' query:
    // relatedQueryKey: ['taskDetails'],
    // relatedIdField: 'taskId', 
    // For now, we only manage task_completion_history directly in mutationFn.
  });
};

