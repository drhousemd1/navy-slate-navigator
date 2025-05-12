
import { queryClient } from "../queryClient";
import { loadRewardsFromDB } from "../indexedDB/useIndexedDB";

export function usePreloadRewards() {
  return async () => {
    const data = await loadRewardsFromDB();
    if (data && Array.isArray(data) && data.length > 0) {
      queryClient.setQueryData(["rewards"], data);
    }
    return null;
  };
}
