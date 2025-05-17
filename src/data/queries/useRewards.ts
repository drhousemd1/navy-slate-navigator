
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query"; // Changed from usePersistentQuery
import { supabase } from '@/integrations/supabase/client';
import {
  loadRewardsFromDB,
  saveRewardsToDB,
  getLastSyncTimeForRewards,
  setLastSyncTimeForRewards
} from "../indexedDB/useIndexedDB";
import { Reward } from '@/lib/rewardUtils';

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
        // Ensure transformation is applied if it was in usePersistentQuery
        return localData.map(row => ({
          ...row,
          is_dom_reward: (row as any).is_dominant // Retain existing transformation logic
        }));
      }

      const { data, error } = await supabase.from("rewards").select("*");
      if (error) throw error;

      if (data) {
        const processedData = data.map(row => ({
          ...row,
          is_dom_reward: (row as any).is_dominant // Retain existing transformation logic
        } as Reward));
        await saveRewardsToDB(processedData);
        await setLastSyncTimeForRewards(new Date().toISOString());
        return processedData;
      }

      return localData ? localData.map(row => ({
        ...row,
        is_dom_reward: (row as any).is_dominant // Retain existing transformation logic
      })) : [];
    },
    // initialData: undefined, // Removed: Persister handles initial data hydration
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });
}

