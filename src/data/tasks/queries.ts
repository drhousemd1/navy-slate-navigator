import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import {
  loadTasksFromDB,
  saveTasksToDB,
  getLastSyncTimeForTasks,
  setLastSyncTimeForTasks
} from "@/data/indexedDB/useIndexedDB";
import { Task, TaskPriority, processTasksWithRecurringLogic, processTaskFromDb } from '@/lib/taskUtils'; // Import processTaskFromDb
import { withTimeout, DEFAULT_TIMEOUT_MS } from '@/lib/supabaseUtils';
import { PostgrestError } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { RawSupabaseTask } from '@/data/tasks/types'; // Import RawSupabaseTask

export const TASKS_QUERY_KEY = ["tasks"];
export const TASK_QUERY_KEY = (taskId: string) => ["tasks", taskId];

export const fetchTasks = async (): Promise<Task[]> => {
  const localData = (await loadTasksFromDB()) as RawSupabaseTask[] | null; // Assume local data might be raw
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
    // Process raw local data if it hasn't been processed yet
    return processTasksWithRecurringLogic(localData.map(task => task as RawSupabaseTask));
  }

  logger.debug('[fetchTasks] Fetching tasks from server');
  
  try {
    type RawTaskResponse = {
      data: RawSupabaseTask[] | null; // Expect RawSupabaseTask array
      error: PostgrestError | null;
    };

    const result = await withTimeout<RawTaskResponse>(async (signal) => {
      const response = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(signal);
      // Cast to RawTaskResponse, Supabase client might return `any[]` in `data`
      return response as unknown as RawTaskResponse;
    }, DEFAULT_TIMEOUT_MS);
    
    const { data, error } = result;

    if (error) {
      logger.error('[fetchTasks] Supabase error fetching tasks:', error);
      if (localData) {
        logger.warn('[fetchTasks] Server fetch failed, returning stale data from IndexedDB');
        return processTasksWithRecurringLogic(localData.map(task => task as RawSupabaseTask));
      }
      throw error;
    }

    if (data) {
      // Data is already RawSupabaseTask[], no need for tasksWithDefaults map here if process handles defaults
      const processedData = processTasksWithRecurringLogic(data);
      // Save processed data to DB, or raw if that's the strategy
      // Assuming saveTasksToDB expects processed Task[]
      await saveTasksToDB(processedData); 
      await setLastSyncTimeForTasks(new Date().toISOString());
      logger.debug('[fetchTasks] Tasks fetched from server and saved to IndexedDB');
      return processedData;
    }
    // If server returns no data, but we have local data, use it.
    return localData ? processTasksWithRecurringLogic(localData.map(task => task as RawSupabaseTask)) : [];
  } catch (error) {
    logger.error('[fetchTasks] Error fetching tasks:', error);
    if (localData) {
      logger.warn('[fetchTasks] Error fetching tasks, using cached data:', error);
      return processTasksWithRecurringLogic(localData.map(task => task as RawSupabaseTask));
    }
    throw error;
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
  return useQuery<Task | undefined, Error, Task | undefined, (string | null)[]>({
    queryKey: taskId ? TASK_QUERY_KEY(taskId) : ['tasks', null], // Handle null taskId
    queryFn: async () => {
      if (!taskId) return undefined;
      
      try {
        type RawSingleTaskResponse = {
          data: RawSupabaseTask | null; // Expect single RawSupabaseTask or null
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
        
        if (error) throw error;
        if (!data) return undefined;
        
        // Process the single raw task
        return processTaskFromDb(data); 
      } catch (error) {
        logger.error(`[useTaskQuery] Error fetching task with ID ${taskId}:`, error);
        throw error;
      }
    },
    enabled: !!taskId, // Only run if taskId is provided
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1000 * 60 * 60,
    retry: 3,
    retryDelay: attempt => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 30000),
  });
};
