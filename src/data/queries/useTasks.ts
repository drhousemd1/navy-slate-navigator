
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { usePersistentQuery as useQuery } from "./usePersistentQuery";
import { supabase } from '@/integrations/supabase/client';
import {
  loadTasksFromDB,
  saveTasksToDB,
  getLastSyncTimeForTasks,
  setLastSyncTimeForTasks
} from "../indexedDB/useIndexedDB";
import { Task, processTaskFromDb } from "@/lib/taskUtils"; // Import processTaskFromDb and Task type

export function useTasks() {
  return useQuery<Task[], Error>({ // Specify Task[] type for useQuery
    queryKey: ["tasks"],
    queryFn: async () => {
      const localData = await loadTasksFromDB();
      const lastSync = await getLastSyncTimeForTasks();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData && localData.length > 0) {
        console.log('[useTasks query] Returning processed local data from IndexedDB');
        return localData.map(processTaskFromDb); // Process local data
      }

      console.log('[useTasks query] Fetching tasks from Supabase');
      const { data, error } = await supabase.from("tasks").select("*").order('created_at', { ascending: false });
      if (error) {
        console.error('[useTasks query] Error fetching from Supabase:', error);
        throw error;
      }

      if (data) {
        const processedData = data.map(processTaskFromDb); // Process fetched data
        await saveTasksToDB(processedData);
        await setLastSyncTimeForTasks(new Date().toISOString());
        console.log('[useTasks query] Saved processed Supabase data to IndexedDB');
        return processedData;
      }
      
      // Fallback to local data if Supabase fetch yields no data (but no error)
      // Or if localData was empty initially.
      if (localData && localData.length > 0) {
        console.log('[useTasks query] Fallback: Returning processed local data from IndexedDB');
        return localData.map(processTaskFromDb);
      }
      return []; // Return empty array if no data anywhere
    },
    initialData: undefined, // Let queryFn handle initial data loading
    staleTime: 1000 * 60 * 5, // Data is stale after 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false // Consider true for better real-time feel if desired
  });
}
