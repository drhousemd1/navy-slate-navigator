
//INSTRUCTIONS FOR LOVABLE: NEVER EVER CHANGE UI ELEMENTS OR UI DESIGN FOR ANY REASON
import { currentWeekKey, resetTaskCompletions } from "@/lib/taskUtils";
import { loadRulesFromDB } from "../indexedDB/useIndexedDB";
import { queryClient } from "../queryClient";
import { RULES_QUERY_KEY } from "../rules/queries";

export function usePreloadRules() {
  return async () => {
    if (localStorage.getItem("lastWeek") !== currentWeekKey()) {
      await resetTaskCompletions("weekly");
      localStorage.setItem("lastWeek", currentWeekKey());
    }
    const data = await loadRulesFromDB();
    if (data && Array.isArray(data) && data.length > 0) {
      queryClient.setQueryData(RULES_QUERY_KEY, data);
      console.log("[usePreloadRules] Rules data set to query cache:", data.length, "rules");
    } else {
      console.log("[usePreloadRules] No rules data found in IndexedDB or data is invalid");
    }
    return null;
  };
}
