import { useQuery, UseQueryResult } from "@tanstack/react-query";
import {
  loadRewardsFromDB,
  saveRewardsToDB,
  getLastSyncTimeForRewards,
  setLastSyncTimeForRewards
} from "../indexedDB/useIndexedDB";
import { Reward } from '@/data/rewards/types';
import { fetchRewards as fetchRewardsFromServer } from '@/data/rewards/queries'; 

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
        console.log('[useRewards] Returning rewards from IndexedDB (hook-level)');
        return localData;
      }

      console.log('[useRewards] Fetching rewards from server (via hook)');
      try {
        const serverData = await fetchRewardsFromServer(); 

        if (serverData) {
          await saveRewardsToDB(serverData);
          await setLastSyncTimeForRewards(new Date().toISOString());
          console.log('[useRewards] Rewards fetched from server and saved to IndexedDB (via hook)');
          return serverData;
        }
        return localData || []; // Fallback to local data if server returns nothing
      } catch (error) {
        console.error('[useRewards] Error fetching rewards from server (via hook):', error);
        if (localData) {
          console.warn('[useRewards] Server fetch failed, returning stale data from IndexedDB (via hook)');
          return localData;
        }
        throw error; 
      }
    },
    staleTime: Infinity, // Data is fresh indefinitely
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false, // Controlled by sync manager
    refetchOnReconnect: false,  // Controlled by sync manager
    refetchOnMount: false,     // Controlled by sync manager
    retry: 1,
    retryDelay: attempt => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 10000),
  });

  // Simplified: Indicates if an error occurred but we are still showing data from cache.
  const isUsingCachedData = !!queryResult.error && !!queryResult.data && queryResult.data.length > 0;

  return {
    ...queryResult,
    isUsingCachedData
  };
}
