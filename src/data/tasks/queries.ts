
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
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

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
};

export const useTasksQuery = (): UseQueryResult<Task[], Error> => {
  return useQuery<Task[], Error>({
    queryKey: TASKS_QUERY_KEY,
    queryFn: fetchTasks,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false, // Relies on cache or initial fetch
    gcTime: 1000 * 60 * 60, // 1 hour
  });
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
      // Attempt to get from the main 'tasks' cache first
      // This part is tricky as queryClient is not directly available here
      // This hook might be better implemented by selecting from the useTasksQuery data
      // Or, fetch directly:
      const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).single();
      if (error) throw error;
      return data ? processTasksWithRecurringLogic([data as Task])[0] : undefined;
    },
    enabled: !!taskId, // Only run if taskId is provided
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1000 * 60 * 60,
  });
};
