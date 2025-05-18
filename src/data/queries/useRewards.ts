
import { useQuery } from "@tanstack/react-query";
import {
  loadRewardsFromDB,
  saveRewardsToDB,
  getLastSyncTimeForRewards,
  setLastSyncTimeForRewards
} from "../indexedDB/useIndexedDB";
import { Reward } from '@/data/rewards/types'; // Updated import
import { fetchRewards as fetchRewardsFromServer } from '@/lib/rewardUtils'; // Renamed to avoid conflict

export function useRewards() {
  return useQuery<Reward[]>({
    queryKey: ["rewards"],
    queryFn: async () => {
      const localData = await loadRewardsFromDB() as Reward[] | null;
      const lastSync = await getLastSyncTimeForRewards();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        // Ensure transformation for is_dom_reward is consistent if needed, though fetchRewardsFromServer should handle it.
        // The fetchRewardsFromServer already ensures is_dom_reward is boolean.
        return localData;
      }

      // Use the centralized fetchRewardsFromServer function
      const serverData = await fetchRewardsFromServer();

      if (serverData) {
        // serverData is already processed by fetchRewardsFromServer to include is_dom_reward
        await saveRewardsToDB(serverData);
        await setLastSyncTimeForRewards(new Date().toISOString());
        return serverData;
      }

      // Fallback if server fetch somehow fails but doesn't throw, or returns empty
      // localData here would also have is_dom_reward correctly from previous saves
      return localData || [];
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });
}
