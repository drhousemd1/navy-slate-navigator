import { queryClient } from "../queryClient";
import { loadRewardsFromDB, saveRewardsToDB, getLastSyncTimeForRewards, setLastSyncTimeForRewards } from "../indexedDB/useIndexedDB";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";
import { Reward } from '@/data/rewards/types';
import { fetchRewards, REWARDS_QUERY_KEY } from '@/data/rewards/queries';
import { useUserIds } from '@/contexts/UserIdsContext';
import { checkAndPerformRewardsResets } from "@/lib/rewardsUtils";

// Define an interface for the raw reward data from IndexedDB before migration
type RawRewardFromDBBeforeMigration = Omit<Reward, 'is_dom_reward'> & {
  is_dominant?: boolean;
};

export function usePreloadRewards() {
  const { subUserId, domUserId } = useUserIds();
  
  return async () => {
    try {
      // Check and perform resets if needed
      await checkAndPerformRewardsResets();
      
      // Check if we have cached data and if it's fresh (30 minute sync strategy)
      const dataFromDB = await loadRewardsFromDB(); 
      const lastSync = await getLastSyncTimeForRewards();
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
            is_dom_reward: is_dominant ?? false,
          } as Reward;
        });
        
        // Update the cache with migrated data
        queryClient.setQueryData([...REWARDS_QUERY_KEY, subUserId, domUserId], migratedRewards);
        
        // If we should not fetch (data is fresh), return early
        if (!shouldFetch) {
          logger.debug("[usePreloadRewards] Using fresh cached data");
          return null;
        }
        
        // Persist the migrated data back to IndexedDB
        await saveRewardsToDB(migratedRewards);
      }

      // If we should fetch fresh data or have no cached data
      if (shouldFetch) {
        logger.debug("[usePreloadRewards] Fetching fresh data from server");
        try {
          const freshData = await fetchRewards(subUserId, domUserId);
          queryClient.setQueryData([...REWARDS_QUERY_KEY, subUserId, domUserId], freshData);
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
