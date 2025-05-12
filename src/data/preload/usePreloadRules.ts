
import { queryClient } from "../queryClient";
import { loadRulesFromDB } from "../indexedDB/useIndexedDB";

export function usePreloadRules() {
  return async () => {
    const data = await loadRulesFromDB();
    if (data && Array.isArray(data) && data.length > 0) {
      queryClient.setQueryData(["rules"], data);
    }
    return null;
  };
}
