
import { currentWeekKey, resetTaskCompletions } from "@/lib/taskUtils";
import { queryClient } from "../queryClient";
import { loadRewardsFromDB, saveRewardsToDB } from "../indexedDB/useIndexedDB";

export function usePreloadRewards() {
  return async () => {
    if (localStorage.getItem("lastWeek") !== currentWeekKey()) {
      await resetTaskCompletions("weekly");
      localStorage.setItem("lastWeek", currentWeekKey());
    }
    const data = await loadRewardsFromDB();
    if (data && Array.isArray(data) && data.length > 0) {
      // Migrate the rewards data to ensure is_dom_reward flag exists on every row
      const migrated = data.map((r: any) => ({
        ...r,
        is_dom_reward: r.is_dominant ?? false
      }));
      
      // Update the cache with migrated data
      queryClient.setQueryData(["rewards"], migrated);
      
      // Persist the migrated data back to IndexedDB for future boots
      await saveRewardsToDB(migrated);
    }
    return null;
  };
}
