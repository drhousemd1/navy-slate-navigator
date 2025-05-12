
import { queryClient } from "../queryClient";
import { loadRulesFromDB } from "../indexedDB/useIndexedDB";

export async function usePreloadRules() {
  const data = await loadRulesFromDB();
  if (data && data.length > 0) {
    queryClient.setQueryData(["rules"], data);
  }
}
