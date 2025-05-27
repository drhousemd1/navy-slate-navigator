
import { currentWeekKey, resetTaskCompletions } from "@/lib/taskUtils";
import { loadRulesFromDB } from "../indexedDB/useIndexedDB";
import { queryClient } from "../queryClient";
import { RULES_QUERY_KEY } from "../rules/queries";
import { logger } from '@/lib/logger'; // Added logger import

export function usePreloadRules() {
  return async () => {
    if (localStorage.getItem("lastWeek") !== currentWeekKey()) {
      await resetTaskCompletions("weekly");
      localStorage.setItem("lastWeek", currentWeekKey());
    }
    const data = await loadRulesFromDB();
    if (data && Array.isArray(data) && data.length > 0) {
      queryClient.setQueryData(RULES_QUERY_KEY, data);
      logger.log("[usePreloadRules] Rules data set to query cache:", data.length, "rules"); // Replaced console.log
    } else {
      logger.log("[usePreloadRules] No rules data found in IndexedDB or data is invalid"); // Replaced console.log
    }
    return null;
  };
}

