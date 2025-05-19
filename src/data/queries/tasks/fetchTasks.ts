
import { supabase } from '@/integrations/supabase/client';
import {
  loadTasksFromDB,
  saveTasksToDB,
  getLastSyncTimeForTasks,
  setLastSyncTimeForTasks,
} from '@/data/indexedDB/tasksIndexedDB'; // Updated import path
import { Task } from '@/data/tasks/types'; // Use canonical Task type
import { processTasksWithRecurringLogic } from '@/lib/taskUtils'; 

export const fetchTasks = async (): Promise<Task[]> => {
  const localData = (await loadTasksFromDB()) as Task[] | null; // loadTasksFromDB should return Task[]
  const lastSync = await getLastSyncTimeForTasks();
  let shouldFetchFromServer = true;

  if (lastSync) {
    const timeDiff = Date.now() - new Date(lastSync as string).getTime();
    if (timeDiff < 1000 * 60 * 30) { // 30 minutes
      shouldFetchFromServer = false;
    }
  }

  if (!shouldFetchFromServer && localData) {
    console.log('[fetchTasks] Returning tasks from IndexedDB');
    // processTasksWithRecurringLogic expects Task[] from types.ts
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
    // Ensure data from Supabase is cast to Task[] before processing
    const serverTasks = data as unknown as Task[]; 
    const processedData = processTasksWithRecurringLogic(serverTasks);
    await saveTasksToDB(processedData);
    await setLastSyncTimeForTasks(new Date().toISOString());
    console.log('[fetchTasks] Tasks fetched from server and saved to IndexedDB');
    return processedData;
  }

  return localData ? processTasksWithRecurringLogic(localData) : [];
};
