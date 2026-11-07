import { legacyQueryKey, captureCacheToken, readResetMarker, writeResetMarker, type CacheToken } from '@/data/indexedDB/useIndexedDB';

import { currentWeekKey, resetTaskCompletions } from "@/lib/taskUtils";
import { queryClient } from "../queryClient";
import { loadRewardsFromDB, saveRewardsToDB, getLastSyncTimeForRewards } from "../indexedDB/useIndexedDB";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";
import { Reward } from '@/data/rewards/types';
import { fetchRewards, REWARDS_QUERY_KEY } from '@/data/rewards/queries';
import { useUserIds } from '@/contexts/UserIdsContext';

// Define an interface for the raw reward data from IndexedDB before migration
type RawRewardFromDBBeforeMigration = Omit<Reward, 'is_dom_reward'> & {
  is_dominant?: boolean;
};

export function usePreloadRewards() {
  const cacheToken = captureCacheToken();
  const { subUserId, domUserId } = useUserIds();

  return async () => {
    try {
      // Reset weekly task completions if needed
      if (await readResetMarker('taskWeekly', cacheToken) !== currentWeekKey()) {
        await resetTaskCompletions("weekly", cacheToken);
        await writeResetMarker('taskWeekly', currentWeekKey(), cacheToken);
      }

      // Check if we have cached data and if it's fresh (30 minute sync strategy)
      const dataFromDB = await loadRewardsFromDB(cacheToken);
      const lastSync = await getLastSyncTimeForRewards(cacheToken);
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync).getTime();
        if (timeDiff < 1000 * 60 * 30 && dataFromDB && dataFromDB.length > 0) {
          shouldFetch = false;
        }
      } else if (dataFromDB && dataFromDB.length > 0) {
        shouldFetch = false;
      }

      if (dataFromDB && Array.isArray(dataFromDB) && dataFromDB.length > 0) {
        // Explicitly type 'data' and migrate if needed
        const rewardsToMigrate = dataFromDB as RawRewardFromDBBeforeMigration[];

        // Migrate the rewards data to ensure is_dom_reward flag exists on every row
        const migratedRewards: Reward[] = rewardsToMigrate.map((r: RawRewardFromDBBeforeMigration): Reward => {
          const { is_dominant, ...restOfReward } = r;
          return {
            ...restOfReward,
            is_dom_reward: is_dominant ?? false } as Reward;
        });

        // Update the cache with migrated data
        queryClient.setQueryData(legacyQueryKey(REWARDS_QUERY_KEY, cacheToken), migratedRewards);

        // If we should not fetch (data is fresh), return early
        if (!shouldFetch) {
          logger.debug("[usePreloadRewards] Using fresh cached data");
          return null;
        }

        // Persist the migrated data back to IndexedDB
        await saveRewardsToDB(migratedRewards, cacheToken);
      }

      // If we should fetch fresh data or have no cached data
      if (shouldFetch) {
        logger.debug("[usePreloadRewards] Fetching fresh data from server");
        try {
          const freshData = await fetchRewards(subUserId, domUserId);
          queryClient.setQueryData(legacyQueryKey(REWARDS_QUERY_KEY, cacheToken), freshData);
        } catch (error) {
          logger.error("[usePreloadRewards] Failed to fetch fresh data:", error);
          // Keep using cached data if available
        }
      }

      return null;
    } catch (error: unknown) {
      logger.error("Error preloading rewards:", getErrorMessage(error));
      return null;
    }
  };
}
