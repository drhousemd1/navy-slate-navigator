
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { TaskWithId } from '@/data/tasks/types';
import { TASKS_QUERY_KEY } from '../queries'; // Corrected import
import { loadTasksFromDB, saveTasksToDB, setLastSyncTimeForTasks } from '@/data/indexedDB/useIndexedDB';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger'; // Added logger import


export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<TaskWithId, Error, string>({
    queryClient,
    queryKey: TASKS_QUERY_KEY, // Use the constant
    mutationFn: async (taskId: string) => {
      // Also delete related task_completion_history records
      const { error: historyError } = await supabase
        .from('task_completion_history')
        .delete()
        .eq('task_id', taskId);

      if (historyError) {
        logger.warn(`Failed to delete task history for task ${taskId}:`, historyError.message); // Replaced console.warn
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
    },
    entityName: 'Task',
    idField: 'id',
    onSuccessCallback: async (deletedTaskId: string) => {
      logger.log('[useDeleteTask onSuccessCallback] Task deleted on server, updating IndexedDB for task ID:', deletedTaskId); // Replaced console.log
      try {
        const localTasks = await loadTasksFromDB() || [];
        const updatedLocalTasks = localTasks.filter(t => t.id !== deletedTaskId);
        await saveTasksToDB(updatedLocalTasks);
        await setLastSyncTimeForTasks(new Date().toISOString());
        logger.log('[useDeleteTask onSuccessCallback] IndexedDB updated after deleting task.'); // Replaced console.log
      } catch (error) {
        logger.error('[useDeleteTask onSuccessCallback] Error updating IndexedDB:', error); // Replaced console.error
        toast({ variant: "destructive", title: "Local UpdateError", description: "Task deleted on server, but failed to update local data." });
      }
    },
  });
};

