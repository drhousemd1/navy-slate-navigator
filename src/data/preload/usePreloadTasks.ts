import {
  todayKey,
  currentWeekKey,
  resetTaskCompletions,
} from "@/lib/taskUtils";
import { loadTasksFromDB } from "../indexedDB/useIndexedDB";
import { queryClient } from "../queryClient";

export function usePreloadTasks() {
  return async () => {
    try {
      console.log("Preloading tasks data...");
      
      // Daily reset (once per day)
      if (localStorage.getItem("lastDaily") !== todayKey()) {
        await resetTaskCompletions("daily");
        localStorage.setItem("lastDaily", todayKey());
      }
      // Weekly reset (once per week)
      if (localStorage.getItem("lastWeek") !== currentWeekKey()) {
        await resetTaskCompletions("weekly");
        localStorage.setItem("lastWeek", currentWeekKey());
      }

      // Existing preload
      const data = await loadTasksFromDB();
      if (data && Array.isArray(data) && data.length > 0) {
        queryClient.setQueryData(["tasks"], data);
      }
      console.log("Tasks data preloaded successfully!");
      return data;
    } catch (error) {
      console.error("Error preloading tasks:", error);
      return null;
    }
  };
}
