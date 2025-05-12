
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import {
  loadRewardsFromDB,
  saveRewardsToDB,
  getLastSyncTimeForRewards,
  setLastSyncTimeForRewards
} from "../indexedDB/useIndexedDB";

export function useRewards() {
  return useQuery({
    queryKey: ["rewards"],
    queryFn: async () => {
      const localData = await loadRewardsFromDB();
      const lastSync = await getLastSyncTimeForRewards();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) {
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        return localData.map(row => ({
          ...row,
          is_dom_reward: row.is_dominant // Add this property
        }));
      }

      const { data, error } = await supabase.from("rewards").select("*");
      if (error) throw error;

      if (data) {
        const processedData = data.map(row => ({
          ...row,
          is_dom_reward: row.is_dominant // Add this property
        }));
        await saveRewardsToDB(processedData);
        await setLastSyncTimeForRewards(new Date().toISOString());
        return processedData;
      }

      return localData ? localData.map(row => ({
        ...row,
        is_dom_reward: row.is_dominant // Add this property
      })) : [];
    },
    // Fix: Remove the async function and use undefined instead
    initialData: undefined,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    refetchOnWindowFocus: false
  });
}
