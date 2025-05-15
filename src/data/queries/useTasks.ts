
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

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const localData = await loadTasksFromDB();
      const lastSync = await getLastSyncTimeForTasks();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) {
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        return localData;
      }

      const { data, error } = await supabase.from("tasks").select("*");
      if (error) throw error;

      if (data) {
        await saveTasksToDB(data);
        await setLastSyncTimeForTasks(new Date().toISOString());
        return data;
      }

      return localData;
    },
    // Fix: Remove the async function and use undefined instead
    initialData: undefined,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    refetchOnWindowFocus: false
  });
}
