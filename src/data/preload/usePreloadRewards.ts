
import { currentWeekKey, resetTaskCompletions } from "@/lib/taskUtils";
import { queryClient } from "../queryClient";
import { loadRewardsFromDB, saveRewardsToDB } from "../indexedDB/useIndexedDB";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";
import { Reward } from '@/data/rewards/types'; // Added import for Reward type

// Define an interface for the raw reward data from IndexedDB before migration
// This assumes the structure is largely similar to Reward but has is_dominant instead of is_dom_reward
type RawRewardFromDBBeforeMigration = Omit<Reward, 'is_dom_reward'> & {
  is_dominant?: boolean;
};

export function usePreloadRewards() {
  return async () => {
    try {
      if (localStorage.getItem("lastWeek") !== currentWeekKey()) {
        await resetTaskCompletions("weekly");
        localStorage.setItem("lastWeek", currentWeekKey());
      }
      
      // loadRewardsFromDB likely returns RawRewardFromDBBeforeMigration[] or a less structured array
      const dataFromDB = await loadRewardsFromDB(); 

      if (dataFromDB && Array.isArray(dataFromDB) && dataFromDB.length > 0) {
        // Explicitly type 'data' if loadRewardsFromDB doesn't return a strongly typed array
        const rewardsToMigrate = dataFromDB as RawRewardFromDBBeforeMigration[];

        // Migrate the rewards data to ensure is_dom_reward flag exists on every row
        const migratedRewards: Reward[] = rewardsToMigrate.map((r: RawRewardFromDBBeforeMigration): Reward => {
          // Create a new object that conforms to the Reward interface
          const { is_dominant, ...restOfReward } = r;
          return {
            ...restOfReward, // Spread the rest of the properties from r
            is_dom_reward: is_dominant ?? false, // Set is_dom_reward based on is_dominant
            // Ensure all required Reward fields are present, or provide defaults if necessary.
            // Example: if created_at or updated_at might be missing from RawRewardFromDBBeforeMigration
            // created_at: r.created_at || new Date().toISOString(), 
            // updated_at: r.updated_at || new Date().toISOString(),
          } as Reward; // Asserting as Reward after transformation
        });
        
        // Update the cache with migrated data
        queryClient.setQueryData(["rewards"], migratedRewards);
        
        // Persist the migrated data back to IndexedDB for future boots
        await saveRewardsToDB(migratedRewards);
      }
      return null;
    } catch (error: unknown) {
      logger.error("Error preloading rewards:", getErrorMessage(error));
      return null;
    }
  };
}
