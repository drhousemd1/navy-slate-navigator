
```typescript
import { useQuery } from "@tanstack/react-query";
import {
  loadRewardsFromDB,
  saveRewardsToDB,
  getLastSyncTimeForRewards,
  setLastSyncTimeForRewards
} from "../indexedDB/useIndexedDB";
import { Reward } from '@/data/rewards/types'; // Updated import
import { fetchRewards as fetchRewardsFromServer } from '@/lib/rewardUtils';

export function useRewards() {
  return useQuery<Reward[]>({ // Ensure Reward[] is used here
    queryKey: ["rewards"],
    queryFn: async () => {
      const localData = await loadRewardsFromDB(); // No cast needed if loadRewardsFromDB returns Reward[] | null
      const lastSync = await getLastSyncTimeForRewards();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync).getTime(); // No cast needed
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        return localData;
      }

      const serverData = await fetchRewardsFromServer();

      if (serverData) {
        await saveRewardsToDB(serverData);
        await setLastSyncTimeForRewards(new Date().toISOString());
        return serverData;
      }
      return localData || [];
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });
}
```
