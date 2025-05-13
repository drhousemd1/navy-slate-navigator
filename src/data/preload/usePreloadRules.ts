
import { currentWeekKey, resetTaskCompletions } from "@/lib/taskUtils";
import { loadRulesFromDB } from "../indexedDB/useIndexedDB";
import { queryClient } from "../queryClient";

export function usePreloadRules() {
  return async () => {
    if (localStorage.getItem("lastWeek") !== currentWeekKey()) {
      await resetTaskCompletions("weekly");
      localStorage.setItem("lastWeek", currentWeekKey());
    }
    const data = await loadRulesFromDB();
    if (data && Array.isArray(data) && data.length > 0) {
      queryClient.setQueryData(["rules"], data);
    }
    return null;
  };
}
