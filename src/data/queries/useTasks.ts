
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/lib/taskUtils'; // Assuming Task interface is correctly defined here
import {
  loadTasksFromDB,
  saveTasksToDB,
  getLastSyncTimeForTasks,
  setLastSyncTimeForTasks
} from "../indexedDB/useIndexedDB";

export function useTasks() {
  return useQuery<Task[], Error>({ 
    queryKey: ["tasks"],
    queryFn: async () => {
      const localData = await loadTasksFromDB() as Task[] | null;
      const lastSync = await getLastSyncTimeForTasks();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        // Sync if older than 30 minutes
        if (timeDiff < 1000 * 60 * 30) { 
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        console.log("[useTasks] Using cached tasks from IndexedDB.");
        return localData;
      }

      console.log("[useTasks] Fetching tasks from Supabase.");
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order('created_at', { ascending: false });

      if (error) {
        console.error("[useTasks] Error fetching tasks from Supabase:", error);
        // If Supabase fetch fails, and we have local data (even if stale), return it.
        if (localData) {
          console.warn("[useTasks] Supabase fetch failed, returning stale local data.");
          return localData;
        }
        throw error; // Otherwise, throw the error to be handled by React Query
      }

      if (data) {
        const tasksData = data as Task[];
        await saveTasksToDB(tasksData);
        await setLastSyncTimeForTasks(new Date().toISOString());
        console.log("[useTasks] Successfully fetched and cached tasks.");
        return tasksData;
      }

      // Fallback to localData if Supabase returns no data (e.g. empty table)
      // or if data is null for some reason but no error.
      console.log("[useTasks] No data from Supabase, returning local data or empty array.");
      return localData || []; 
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    // refetchOnMount is false by default in queryClient config
    // refetchOnReconnect is false by default in queryClient config
  });
}
