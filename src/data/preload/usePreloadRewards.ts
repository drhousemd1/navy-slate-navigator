
import { queryClient } from "../queryClient";
import { loadRewardsFromDB } from "../indexedDB/useIndexedDB";

export async function usePreloadRewards() {
  const data = await loadRewardsFromDB();
  if (data && data.length > 0) {
    queryClient.setQueryData(["rewards"], data);
  }
}
