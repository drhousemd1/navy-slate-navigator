
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
      logger.debug('[usePreloadTasks] Loading cached task data (reset check handled by Tasks page)');
      
      // Only load existing cached data - reset check is now handled by the Tasks page
      const data = await loadTasksFromDB();
      if (data && Array.isArray(data) && data.length > 0) {
        queryClient.setQueryData(["tasks"], data);
        logger.debug('[usePreloadTasks] Loaded existing cached task data');
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
