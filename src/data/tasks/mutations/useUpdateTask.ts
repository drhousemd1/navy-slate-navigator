import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
import { TaskWithId, UpdateTaskVariables } from '@/data/tasks/types';
import { TASKS_QUERY_KEY } from '../queries';
import { loadTasksFromDB, saveTasksToDB, setLastSyncTimeForTasks } from '@/data/indexedDB/useIndexedDB';
import { toast } from '@/hooks/use-toast';

export type { UpdateTaskVariables }; // Changed to export type

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useUpdateOptimisticMutation<TaskWithId, Error, UpdateTaskVariables>({
    queryClient,
    queryKey: TASKS_QUERY_KEY, // Use the constant
    mutationFn: async (variables: UpdateTaskVariables) => {
      const { id, ...updates } = variables;
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
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
      console.log('[useUpdateTask onSuccessCallback] Task updated on server, updating IndexedDB.', updatedTaskData);
      try {
        const localTasks = await loadTasksFromDB() || [];
        const updatedLocalTasks = localTasks.map(t => t.id === updatedTaskData.id ? updatedTaskData : t);
        await saveTasksToDB(updatedLocalTasks);
        await setLastSyncTimeForTasks(new Date().toISOString());
        console.log('[useUpdateTask onSuccessCallback] IndexedDB updated with updated task.');
      } catch (error) {
        console.error('[useUpdateTask onSuccessCallback] Error updating IndexedDB:', error);
        toast({ variant: "destructive", title: "Local Save Error", description: "Task updated on server, but failed to save changes locally." });
      }
    },
  });
};
