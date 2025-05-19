
import { useQuery } from "@tanstack/react-query";
import {
  loadRewardsFromDB,
  saveRewardsToDB,
  getLastSyncTimeForRewards,
  setLastSyncTimeForRewards
} from "../indexedDB/rewardsIndexedDB"; // Updated import path
import { Reward } from '@/data/rewards/types';
import { fetchRewards as fetchRewardsFromServer } from '@/lib/rewardUtils';

export function useRewards() {
  return useQuery<Reward[]>({
    queryKey: ["rewards"],
    queryFn: async () => {
      const localData = await loadRewardsFromDB();
      const lastSync = await getLastSyncTimeForRewards();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync).getTime();
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        console.log('[useRewards] Returning rewards from IndexedDB');
        return localData;
      }

      console.log('[useRewards] Fetching rewards from server');
      const serverData = await fetchRewardsFromServer(); // This function needs to return Reward[]

      if (serverData) {
        // Ensure serverData is correctly typed as Reward[] before saving
        await saveRewardsToDB(serverData as Reward[]);
        await setLastSyncTimeForRewards(new Date().toISOString());
        console.log('[useRewards] Rewards fetched from server and saved to IndexedDB');
        return serverData as Reward[];
      }
      
      // If server fetch fails or returns no data, return local data if available
      if (localData) {
        console.warn('[useRewards] Server fetch failed or returned no data, returning stale data from IndexedDB');
        return localData;
      }
      
      return []; // Fallback to empty array if no data anywhere
    },
    staleTime: Infinity, // Consider adjusting staleTime if frequent updates are expected
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });
}
