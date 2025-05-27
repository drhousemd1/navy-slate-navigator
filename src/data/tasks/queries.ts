import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import {
  loadTasksFromDB,
  saveTasksToDB,
  getLastSyncTimeForTasks,
  setLastSyncTimeForTasks
} from "@/data/indexedDB/useIndexedDB";
import { Task, TaskPriority, processTasksWithRecurringLogic, processTaskFromDb } from '@/lib/taskUtils';
import { withTimeout, DEFAULT_TIMEOUT_MS } from '@/lib/supabaseUtils';
import { PostgrestError } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { RawSupabaseTask } from '@/data/tasks/types';
import { isPostgrestError, isSupabaseAuthError, isAppError, createAppError, getErrorMessage, CaughtError } from '@/lib/errors';

export const TASKS_QUERY_KEY = ["tasks"];
export const TASK_QUERY_KEY = (taskId: string) => ["tasks", taskId];

export const fetchTasks = async (): Promise<Task[]> => {
  const localData = (await loadTasksFromDB()) as RawSupabaseTask[] | null;
  const lastSync = await getLastSyncTimeForTasks();
  let shouldFetchFromServer = true;

  if (lastSync) {
    const timeDiff = Date.now() - new Date(lastSync as string).getTime();
    if (timeDiff < 1000 * 60 * 30 && localData && localData.length > 0) {
      shouldFetchFromServer = false;
    }
  } else if (localData && localData.length > 0) {
    shouldFetchFromServer = false;
  }

  if (!shouldFetchFromServer && localData) {
    logger.debug('[fetchTasks] Returning tasks from IndexedDB');
    return processTasksWithRecurringLogic(localData.map(task => task as RawSupabaseTask));
  }

  logger.debug('[fetchTasks] Fetching tasks from server');
  
  try {
    type RawTaskResponse = {
      data: RawSupabaseTask[] | null;
      error: PostgrestError | null;
    };

    const result = await withTimeout<RawTaskResponse>(async (signal) => {
      const response = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(signal);
      return response as unknown as RawTaskResponse;
    }, DEFAULT_TIMEOUT_MS);
    
    const { data, error } = result;

    if (error) {
      logger.error('[fetchTasks] Supabase error fetching tasks:', error);
      if (localData) {
        logger.warn('[fetchTasks] Server fetch failed, returning stale data from IndexedDB');
        return processTasksWithRecurringLogic(localData.map(task => task as RawSupabaseTask));
      }
      throw error; // PostgrestError is an instance of Error
    }

    if (data) {
      const processedData = processTasksWithRecurringLogic(data);
      await saveTasksToDB(processedData); 
      await setLastSyncTimeForTasks(new Date().toISOString());
      logger.debug('[fetchTasks] Tasks fetched from server and saved to IndexedDB');
      return processedData;
    }
    return localData ? processTasksWithRecurringLogic(localData.map(task => task as RawSupabaseTask)) : [];
  } catch (error: unknown) {
    logger.error('[fetchTasks] Error fetching tasks:', error);
    if (localData) {
      logger.warn('[fetchTasks] Error fetching tasks, using cached data:', error);
      return processTasksWithRecurringLogic(localData.map(task => task as RawSupabaseTask));
    }
    if (isPostgrestError(error) || isSupabaseAuthError(error) || isAppError(error) || error instanceof Error) {
      throw error;
    }
    throw createAppError(getErrorMessage(error), 'FETCH_TASKS_EXCEPTION');
  }
};

// Define the TasksQueryResult type as an intersection type instead of extending an interface
export type TasksQueryResult = ReturnType<typeof useQuery<Task[], Error>> & {
  isUsingCachedData: boolean;
};

export const useTasksQuery = () => {
  const queryResult = useQuery<Task[], Error>({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false, // Relies on cache or initial fetch
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 3,
    retryDelay: attempt => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 30000), // Exponential backoff with max of 30s
  });
  
  // Determine if we're using cached data
  const isUsingCachedData = 
    (!!queryResult.error && queryResult.data && queryResult.data.length > 0) || 
    (queryResult.isStale && queryResult.fetchStatus === 'idle' && queryResult.data && queryResult.data.length > 0 && queryResult.errorUpdateCount > 0); // Adjusted condition for stale data with error
  
  return {
    ...queryResult,
    isUsingCachedData
  };
};

// For fetching a single task, modify the implementation to use the updated withTimeout
export const useTaskQuery = (taskId: string | null) => {
  return useQuery<Task | undefined, CaughtError, Task | undefined, (string | null)[]>({ // Use CaughtError for error type
    queryKey: taskId ? TASK_QUERY_KEY(taskId) : ['tasks', null],
    queryFn: async () => {
      if (!taskId) return undefined;
      
      try {
        type RawSingleTaskResponse = {
          data: RawSupabaseTask | null;
          error: PostgrestError | null;
        };

        const result = await withTimeout<RawSingleTaskResponse>(async (signal) => {
          const response = await supabase
            .from("tasks")
            .select("*")
            .eq("id", taskId)
            .abortSignal(signal)
            .single();
          return response as unknown as RawSingleTaskResponse;
        }, DEFAULT_TIMEOUT_MS);
        
        const { data, error } = result;
        
        if (error) throw error; // PostgrestError is an instance of Error
        if (!data) return undefined;
        
        return processTaskFromDb(data); 
      } catch (error: unknown) {
        logger.error(`[useTaskQuery] Error fetching task with ID ${taskId}:`, error);
        if (isPostgrestError(error) || isSupabaseAuthError(error) || isAppError(error) || error instanceof Error) {
          throw error;
        }
        throw createAppError(getErrorMessage(error), 'FETCH_SINGLE_TASK_EXCEPTION');
      }
    },
    enabled: !!taskId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1000 * 60 * 60,
    retry: 3,
    retryDelay: attempt => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 30000),
  });
};
