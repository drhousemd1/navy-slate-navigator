
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import {
  loadTasksFromDB,
  saveTasksToDB,
  getLastSyncTimeForTasks,
  setLastSyncTimeForTasks
} from "@/data/indexedDB/useIndexedDB";
import { Task, TaskPriority } from '@/lib/taskUtils';
import { processTasksWithRecurringLogic } from '@/lib/taskUtils';
import { withTimeout, DEFAULT_TIMEOUT_MS } from '@/lib/supabaseUtils';
import { PostgrestError } from '@supabase/supabase-js'; // Import PostgrestError
import { logger } from '@/lib/logger'; // Added logger import

export const TASKS_QUERY_KEY = ["tasks"];
export const TASK_QUERY_KEY = (taskId: string) => ["tasks", taskId];

export const fetchTasks = async (): Promise<Task[]> => {
  const localData = (await loadTasksFromDB()) as Task[] | null;
  const lastSync = await getLastSyncTimeForTasks();
  let shouldFetchFromServer = true;

  if (lastSync) {
    const timeDiff = Date.now() - new Date(lastSync as string).getTime();
    // Sync if data is older than 30 minutes or if no local data
    if (timeDiff < 1000 * 60 * 30 && localData && localData.length > 0) {
      shouldFetchFromServer = false;
    }
  } else if (localData && localData.length > 0) {
    // If no lastSync but local data exists, use it for the first load
    shouldFetchFromServer = false;
  }

  if (!shouldFetchFromServer && localData) {
    logger.debug('[fetchTasks] Returning tasks from IndexedDB');
    return processTasksWithRecurringLogic(localData);
  }

  logger.debug('[fetchTasks] Fetching tasks from server');
  
  try {
    // Handle the raw response from Supabase and ensure correct typing
    type RawTaskResponse = {
      data: any[] | null;
      error: PostgrestError | null;
    };

    const result = await withTimeout<RawTaskResponse>(async (signal) => {
      const response = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(signal);
      
      return response;
    }, DEFAULT_TIMEOUT_MS);
    
    const { data, error } = result;

    if (error) {
      logger.error('[fetchTasks] Supabase error fetching tasks:', error);
      if (localData) {
        logger.warn('[fetchTasks] Server fetch failed, returning stale data from IndexedDB');
        return processTasksWithRecurringLogic(localData);
      }
      throw error;
    }

    if (data) {
      // Ensure default values are applied if missing from DB records
      const tasksWithDefaults = data.map(task => ({
        ...task,
        priority: task.priority as TaskPriority || 'medium',
        frequency: task.frequency || 'daily',
        frequency_count: task.frequency_count || 1,
        usage_data: task.usage_data || Array(7).fill(0), // Or whatever default your logic expects
        completed: task.completed || false,
        // Add other defaults as necessary based on Task interface
      })) as Task[];

      const processedData = processTasksWithRecurringLogic(tasksWithDefaults);
      await saveTasksToDB(processedData);
      await setLastSyncTimeForTasks(new Date().toISOString());
      logger.debug('[fetchTasks] Tasks fetched from server and saved to IndexedDB');
      return processedData;
    }

    return localData ? processTasksWithRecurringLogic(localData) : [];
  } catch (error) {
    logger.error('[fetchTasks] Error fetching tasks:', error);
    
    // If we have local data, return it as fallback
    if (localData) {
      logger.warn('[fetchTasks] Error fetching tasks, using cached data:', error);
      return processTasksWithRecurringLogic(localData);
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
          data: any | null;
          error: PostgrestError | null;
        };

        const result = await withTimeout<RawSingleTaskResponse>(async (signal) => {
          const response = await supabase
            .from("tasks")
            .select("*")
            .eq("id", taskId)
            .abortSignal(signal)
            .single();
          
          return response;
        }, DEFAULT_TIMEOUT_MS);
        
        const { data, error } = result;
        
        if (error) throw error;
        
        if (!data) return undefined;
        
        // Ensure we properly cast any string priority to our TaskPriority type
        const taskWithCorrectTypes = {
          ...data,
          priority: (data.priority || 'medium') as TaskPriority
        } as Task;
        
        return processTasksWithRecurringLogic([taskWithCorrectTypes])[0];
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

