import { isCurrentCacheToken, legacyQueryKey, captureCacheToken, type CacheToken } from '@/data/indexedDB/useIndexedDB';

import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { TaskWithId } from '@/data/tasks/types';
import { TASKS_QUERY_KEY } from '../queries';
import { loadTasksFromDB, saveTasksToDB } from '@/data/indexedDB/useIndexedDB';
import { toastManager } from '@/lib/toastManager';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

export const useDeleteTask = () => {
  const cacheToken = captureCacheToken();
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<TaskWithId, Error, string>({
    cacheToken,
    queryClient,
    queryKey: legacyQueryKey(TASKS_QUERY_KEY, cacheToken),
    mutationFn: async (taskId: string) => {
      // Also delete related task_completion_history records
      const { error: historyError } = await supabase
        .from('task_completion_history')
        .delete()
        .eq('task_id', taskId);

      if (historyError) {
        logger.warn(`Failed to delete task history for task ${taskId}:`, historyError.message);
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    entityName: 'Task',
    idField: 'id',
    onSuccessCallback: async (deletedTaskId: string, cacheToken) => {
      logger.debug('[useDeleteTask onSuccessCallback] Task deleted on server, updating IndexedDB for task ID:', deletedTaskId);
      try {
        const localTasks = await loadTasksFromDB(cacheToken) || [];
        const updatedLocalTasks = localTasks.filter(t => t.id !== deletedTaskId);
        await saveTasksToDB(updatedLocalTasks, cacheToken);

        logger.debug('[useDeleteTask onSuccessCallback] IndexedDB updated after deleting task.');
      } catch (e: unknown) {
        if (!isCurrentCacheToken(cacheToken)) return;
        const descriptiveMessage = getErrorMessage(e);
        logger.error('[useDeleteTask onSuccessCallback] Error updating IndexedDB:', descriptiveMessage, e);
        toastManager.error("Local Update Error", `Failed to update local data after deletion: ${descriptiveMessage}`);
      }
    } });
};
