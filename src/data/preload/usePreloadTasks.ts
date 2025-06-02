
import {
  todayKey,
  currentWeekKey,
  resetTaskCompletions,
  checkAndPerformTaskResets,
} from "@/lib/taskUtils";
import { loadTasksFromDB } from "../indexedDB/useIndexedDB";
import { queryClient } from "../queryClient";
import { logger } from "@/lib/logger";

export function usePreloadTasks() {
  return async () => {
    try {
      logger.debug('[usePreloadTasks] Starting task preload and reset check');
      
      // Perform reset check and actual resets if needed
      const resetPerformed = await checkAndPerformTaskResets();
      
      if (resetPerformed) {
        logger.debug('[usePreloadTasks] Resets performed, reloading fresh data from IndexedDB');
        
        // After resets, reload fresh data from IndexedDB
        const freshData = await loadTasksFromDB();
        
        if (freshData && Array.isArray(freshData) && freshData.length > 0) {
          // Update React Query cache with fresh data
          queryClient.setQueryData(["tasks"], freshData);
          logger.debug('[usePreloadTasks] Updated React Query cache with fresh reset data');
        }
      } else {
        // No resets needed, load existing cached data
        const data = await loadTasksFromDB();
        if (data && Array.isArray(data) && data.length > 0) {
          queryClient.setQueryData(["tasks"], data);
          logger.debug('[usePreloadTasks] Loaded existing cached task data');
        }
      }
      
    } catch (error) {
      logger.error('[usePreloadTasks] Error during preload:', error);
      
      // Fallback: try to load any existing data
      const fallbackData = await loadTasksFromDB();
      if (fallbackData && Array.isArray(fallbackData) && fallbackData.length > 0) {
        queryClient.setQueryData(["tasks"], fallbackData);
        logger.debug('[usePreloadTasks] Loaded fallback task data');
      }
    }
    
    return null;
  };
}
