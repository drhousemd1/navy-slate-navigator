
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
import { TaskWithId, UpdateTaskVariables, Json } from '@/data/tasks/types';
import { TASKS_QUERY_KEY } from '../queries';
import { loadTasksFromDB, saveTasksToDB, setLastSyncTimeForTasks } from '@/data/indexedDB/useIndexedDB';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { prepareTaskDataForSupabase } from '@/utils/image/taskIntegration';

export type { UpdateTaskVariables };

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useUpdateOptimisticMutation<TaskWithId, Error, UpdateTaskVariables>({
    queryClient,
    queryKey: TASKS_QUERY_KEY,
    mutationFn: async (variables: UpdateTaskVariables) => {
      const { id, ...updateData } = variables;

      // Prepare the data for Supabase using the utility function
      const updatesForSupabase = prepareTaskDataForSupabase({
        ...updateData,
        updated_at: new Date().toISOString()
      });

      const { data, error } = await supabase
        .from('tasks')
        .update(updatesForSupabase)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Task update failed: No data returned.');
      return data as TaskWithId; 
    },
    entityName: 'Task',
    idField: 'id',
    onSuccessCallback: async (updatedTaskData) => {
      logger.debug('[useUpdateTask onSuccessCallback] Task updated on server, updating IndexedDB.', updatedTaskData);
      try {
        const localTasks = await loadTasksFromDB() || [];
        const updatedLocalTasks = localTasks.map(t => t.id === updatedTaskData.id ? updatedTaskData : t);
        await saveTasksToDB(updatedLocalTasks);
        await setLastSyncTimeForTasks(new Date().toISOString());
        logger.debug('[useUpdateTask onSuccessCallback] IndexedDB updated with updated task.');
        // Invalidate the tasks query to refetch and update the UI
        await queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
        logger.debug('[useUpdateTask onSuccessCallback] Tasks query invalidated.');
      } catch (e: unknown) {
        const descriptiveMessage = getErrorMessage(e);
        logger.error('[useUpdateTask onSuccessCallback] Error updating IndexedDB or invalidating query:', descriptiveMessage, e);
        toast({ 
            variant: "destructive", 
            title: "Local Save Error", 
            description: `Failed to save updated task locally or refresh list: ${descriptiveMessage}` 
        });
      }
    },
  });
};
