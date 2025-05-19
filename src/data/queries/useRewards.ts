
import { useQuery, UseQueryResult } from "@tanstack/react-query"; // Added UseQueryResult
import {
  loadRewardsFromDB,
  saveRewardsToDB,
  getLastSyncTimeForRewards,
  setLastSyncTimeForRewards
} from "../indexedDB/useIndexedDB";
import { Reward } from '@/data/rewards/types';
import { fetchRewards as fetchRewardsFromServer } from '@/lib/rewardUtils'; // This now uses withTimeout

export const REWARDS_QUERY_KEY = ["rewards"];

// Define the RewardsQueryResult type
export type RewardsQueryResult = UseQueryResult<Reward[], Error> & {
  isUsingCachedData: boolean;
};

export function useRewards(): RewardsQueryResult {
  const queryResult = useQuery<Reward[], Error>({
    queryKey: REWARDS_QUERY_KEY,
    queryFn: async () => {
      const localData = await loadRewardsFromDB();
      const lastSync = await getLastSyncTimeForRewards();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync).getTime();
        if (timeDiff < 1000 * 60 * 30 && localData && localData.length > 0) { // 30 minutes
          shouldFetch = false;
        }
      } else if (localData && localData.length > 0) {
        shouldFetch = false;
      }
      
      if (!shouldFetch && localData) {
        console.log('[useRewards] Returning rewards from IndexedDB');
        return localData;
      }

      console.log('[useRewards] Fetching rewards from server');
      try {
        const serverData = await fetchRewardsFromServer(); // This function now uses withTimeout

        if (serverData) {
          await saveRewardsToDB(serverData);
          await setLastSyncTimeForRewards(new Date().toISOString());
          console.log('[useRewards] Rewards fetched from server and saved to IndexedDB');
          return serverData;
        }
        // If server fetch fails or returns no data, but we have local data, return it.
        return localData || [];
      } catch (error) {
        console.error('[useRewards] Error fetching rewards from server:', error);
        if (localData) {
          console.warn('[useRewards] Server fetch failed, returning stale data from IndexedDB');
          return localData;
        }
        throw error; // Rethrow if no local data to fall back on
      }
    },
    staleTime: 1000 * 60 * 5, // Stale after 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    retry: 1,
    retryDelay: attempt => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 10000),
  });

  const isUsingCachedData =
    (!!queryResult.error && queryResult.data && queryResult.data.length > 0) ||
    (queryResult.isStale && queryResult.fetchStatus === 'idle' && queryResult.data && queryResult.data.length > 0 && queryResult.errorUpdateCount > 0);

  return {
    ...queryResult,
    isUsingCachedData
  };
}
