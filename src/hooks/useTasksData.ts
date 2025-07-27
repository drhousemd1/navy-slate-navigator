
import { useCallback } from 'react';
import { useTasksQuery, TasksQueryResult } from '@/data/tasks/queries';
import { TaskWithId, TaskFormValues, CreateTaskVariables, UpdateTaskVariables, Json } from '@/data/tasks/types';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toastManager } from '@/lib/toastManager';
import { saveTasksToDB, loadTasksFromDB } from '@/data/indexedDB/useIndexedDB';
import { useDeleteTask } from '@/data/tasks/mutations/useDeleteTask'; 
import { logger } from '@/lib/logger';
import { useCreateTask } from '@/data/tasks/mutations/useCreateTask';
import { useUpdateTask } from '@/data/tasks/mutations/useUpdateTask';
import { getErrorMessage } from '@/lib/errors';
import { checkAndPerformTaskResets } from '@/lib/taskUtils';

type SaveTaskInput = CreateTaskVariables | UpdateTaskVariables;

export const useTasksData = () => {
  const { 
    data: tasks = [], 
    isLoading, 
    error, 
    refetch,
    isUsingCachedData = false
  }: TasksQueryResult = useTasksQuery();
  
  const queryClient = useQueryClient();
  const deleteTaskMutation = useDeleteTask();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();

  const checkAndReloadTasks = useCallback(async () => {
    try {
      logger.debug('[useTasksData] Checking for task resets');
      
      const resetPerformed = await checkAndPerformTaskResets();
      
      if (resetPerformed) {
        logger.debug('[useTasksData] Resets performed, invalidating cache and reloading fresh data');
        
        // Force complete cache invalidation for tasks
        await queryClient.invalidateQueries({ queryKey: ['tasks'] });
        
        // Reload fresh data from IndexedDB after resets
        const freshData = await loadTasksFromDB();
        
        if (freshData && Array.isArray(freshData)) {
          // Update React Query cache with fresh data
          queryClient.setQueryData(['tasks'], freshData);
          logger.debug('[useTasksData] Updated cache with fresh reset data');
        }
        
        // Force a refetch to ensure we have the latest data from server
        await refetch();
      }
    } catch (error) {
      logger.error('[useTasksData] Error during reset check:', error);
    }
  }, [queryClient, refetch]);

  const saveTask = async (taskData: SaveTaskInput): Promise<TaskWithId | null> => {
    try {
      if ('id' in taskData && taskData.id) {
        const updatePayload: UpdateTaskVariables = taskData;
        return await updateTaskMutation.mutateAsync(updatePayload);
      } else {
        const createPayload: CreateTaskVariables = taskData as CreateTaskVariables;
        return await createTaskMutation.mutateAsync(createPayload);
      }
    } catch (e: unknown) {
      const descriptiveMessage = getErrorMessage(e);
      logger.error("Error in saveTask (useTasksData):", descriptiveMessage, e);
      toastManager.error("Save Error", descriptiveMessage);
      throw e; 
    }
  };

  const deleteTask = async (taskId: string) => {
    return deleteTaskMutation.mutateAsync(taskId);
  };
  
  return {
    tasks,
    isLoading,
    error,
    isUsingCachedData,
    saveTask,
    deleteTask,
    refetch,
    checkAndReloadTasks
  };
};
