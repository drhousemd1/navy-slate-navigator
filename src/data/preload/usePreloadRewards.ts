
import { queryClient } from "../queryClient";
import { loadRewardsFromDB } from "../indexedDB/useIndexedDB"; // Assuming this function exists
import { Reward } from "@/data/rewards/types"; // Using the main Reward type
import { logger } from "@/lib/logger";

// This function might be for migrating old data structures.
// If OldRewardType is no longer used, this migration logic might be obsolete
// or need to be adapted to the current Reward structure.
// For now, using `any` to pass build, but this needs review.
// function transformOldReward(oldReward: any): Reward {
//   // Transformation logic from OldRewardType to Reward
//   return {
//     ...oldReward, // Spread old fields
//     // Map or add new/changed fields
//     // Example: new_field: oldReward.some_old_field || default_value,
//   } as Reward;
// }

export function usePreloadRewards() {
  return async () => {
    try {
      const data = await loadRewardsFromDB(); // This should return Reward[]
      if (data && Array.isArray(data) && data.length > 0) {
        // If data from IndexedDB might be in an old format, transform it here.
        // const transformedData = data.map(item => {
        //   // Check if transformation is needed based on some property
        //   if (item.hasOwnProperty('some_old_property_indicator')) { // Replace with actual check
        //     return transformOldReward(item as any); // Cast to any if it's an old type
        //   }
        //   return item as Reward;
        // });
        // queryClient.setQueryData(["rewards"], transformedData);
        queryClient.setQueryData<Reward[]>(["rewards"], data); // Assuming data is already Reward[]
        logger.debug("Rewards preloaded from IndexedDB.", data.length);
      } else {
        logger.debug("No rewards found in IndexedDB to preload or data is empty/invalid.");
      }
    } catch (error) {
      logger.error("Failed to preload rewards from IndexedDB:", error);
    }
    return null; // queryFn for useQuery expects a Promise or data
  };
}

