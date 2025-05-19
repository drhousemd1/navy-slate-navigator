
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import {
  loadTasksFromDB,
  saveTasksToDB,
  getLastSyncTimeForTasks,
  setLastSyncTimeForTasks
} from "@/data/indexedDB/useIndexedDB";
import { Task } from '@/lib/taskUtils';
import { processTasksWithRecurringLogic } from '@/lib/taskUtils';
import { withTimeout, DEFAULT_TIMEOUT_MS } from '@/lib/supabaseUtils';

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
    console.log('[fetchTasks] Returning tasks from IndexedDB');
    return processTasksWithRecurringLogic(localData);
  }

  console.log('[fetchTasks] Fetching tasks from server');
  
  try {
    const result = await withTimeout(async (signal) => {
      return supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(signal);
    }, DEFAULT_TIMEOUT_MS);
    
    const { data, error } = result;

    if (error) {
      console.error('[fetchTasks] Supabase error fetching tasks:', error);
      if (localData) {
        console.warn('[fetchTasks] Server fetch failed, returning stale data from IndexedDB');
        return processTasksWithRecurringLogic(localData);
      }
      throw error;
    }

    if (data) {
      // Ensure default values are applied if missing from DB records
      const tasksWithDefaults = data.map(task => ({
        ...task,
        priority: task.priority || 'medium',
        frequency: task.frequency || 'daily',
        frequency_count: task.frequency_count || 1,
        usage_data: task.usage_data || Array(7).fill(0), // Or whatever default your logic expects
        completed: task.completed || false,
        // Add other defaults as necessary based on Task interface
      })) as Task[];

      const processedData = processTasksWithRecurringLogic(tasksWithDefaults);
      await saveTasksToDB(processedData);
      await setLastSyncTimeForTasks(new Date().toISOString());
      console.log('[fetchTasks] Tasks fetched from server and saved to IndexedDB');
      return processedData;
    }

    return localData ? processTasksWithRecurringLogic(localData) : [];
  } catch (error) {
    console.error('[fetchTasks] Error fetching tasks:', error);
    
    // If we have local data, return it as fallback
    if (localData) {
      console.warn('[fetchTasks] Error fetching tasks, using cached data:', error);
      return processTasksWithRecurringLogic(localData);
    }
    
    throw error;
  }
};

export interface TasksQueryResult extends UseQueryResult<Task[], Error> {
  isUsingCachedData: boolean;
}

export const useTasksQuery = (): TasksQueryResult => {
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
    (queryResult.isStale && queryResult.errorUpdateCount > 0 && queryResult.data && queryResult.data.length > 0);
  
  return {
    ...queryResult,
    isUsingCachedData
  };
};

// For fetching a single task, it's often more efficient to select from the already fetched list.
// However, if a direct fetch is needed, it can be implemented.
// For now, we'll provide a selector-based approach if used within a component that also calls useTasksQuery.
// A true useTaskQuery(id) would typically fetch a single item from the server if not in cache.
// Given the requirement for staleTime: Infinity, we assume the full list is the source of truth.
export const useTaskQuery = (taskId: string | null): UseQueryResult<Task | undefined, Error> => {
  return useQuery<Task | undefined, Error, Task | undefined, (string | null)[]>({ // Adjusted queryKey type
    queryKey: taskId ? TASK_QUERY_KEY(taskId) : ['tasks', null], // Handle null taskId
    queryFn: async () => {
      if (!taskId) return undefined;
      
      try {
        const result = await withTimeout(async (signal) => {
          return supabase
            .from("tasks")
            .select("*")
            .eq("id", taskId)
            .abortSignal(signal)
            .single();
        }, DEFAULT_TIMEOUT_MS);
        
        const { data, error } = result;
        
        if (error) throw error;
        return data ? processTasksWithRecurringLogic([data as Task])[0] : undefined;
      } catch (error) {
        console.error(`[useTaskQuery] Error fetching task with ID ${taskId}:`, error);
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
