import {
  todayKey,
  currentWeekKey,
  resetTaskCompletions,
} from "@/lib/taskUtils";
import { loadTasksFromDB } from "../indexedDB/useIndexedDB"; // Restore import
import { queryClient } from "../queryClient"; // Import queryClient
import { logger } from "@/lib/logger";
import { Task as IDBTask } from "../indexedDB/useIndexedDB"; // Explicitly type for IDB load

export function usePreloadTasks() {
  return async () => {
    logger.debug("[usePreloadTasks] Running preload tasks logic.");
    // Daily reset (once per day)
    const lastDailyReset = localStorage.getItem("lastDailyTaskReset");
    const currentTodayKey = todayKey();
    if (lastDailyReset !== currentTodayKey) {
      logger.info("[usePreloadTasks] Performing daily task reset.");
      await resetTaskCompletions("daily");
      localStorage.setItem("lastDailyTaskReset", currentTodayKey);
      logger.debug("[usePreloadTasks] Daily task reset complete.");
    } else {
      logger.debug("[usePreloadTasks] Daily task reset not needed today.");
    }

    // Weekly reset (once per week)
    const lastWeeklyReset = localStorage.getItem("lastWeeklyTaskReset");
    const currentCurrentWeekKey = currentWeekKey();
    if (lastWeeklyReset !== currentCurrentWeekKey) {
      logger.info("[usePreloadTasks] Performing weekly task reset.");
      await resetTaskCompletions("weekly");
      localStorage.setItem("lastWeeklyTaskReset", currentCurrentWeekKey);
      logger.debug("[usePreloadTasks] Weekly task reset complete.");
    } else {
      logger.debug("[usePreloadTasks] Weekly task reset not needed this week.");
    }


    // Restore IndexedDB preloading for tasks
    // This runs before React Query's persister might, ensuring our IDB is source if available.
    // React Query persister will still work for other caches or if IDB is empty.
    try {
      const data = await loadTasksFromDB();
      if (data && Array.isArray(data) && data.length > 0) {
        // Ensure the data structure matches what useTasksQuery expects (Task[] from taskUtils)
        // processTaskFromDb might not be needed if loadTasksFromDB already returns processed tasks.
        // Assuming loadTasksFromDB returns tasks that are compatible with `Task` from `taskUtils`.
        // If loadTasksFromDB returns RawSupabaseTask[], they would need processing here.
        // For simplicity, assuming loadTasksFromDB returns the correct Task structure.
        queryClient.setQueryData(["tasks"], data as IDBTask[]); // Use the imported Task type
        logger.debug("[usePreloadTasks] Preloaded tasks into queryClient from IndexedDB.");
      } else {
        logger.debug("[usePreloadTasks] No tasks found in IndexedDB to preload, or persister will handle hydration.");
      }
    } catch (error) {
        logger.error("[usePreloadTasks] Error preloading tasks from IndexedDB:", error);
    }
    
    logger.debug("[usePreloadTasks] Task preloading and reset logic executed.");
    return null;
  };
}
