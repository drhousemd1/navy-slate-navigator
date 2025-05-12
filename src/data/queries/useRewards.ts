
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
  setLastSyncTimeForRewards,
  loadPointsFromDB, 
  saveDomPointsToDB, 
  loadDomPointsFromDB, 
  savePointsToDB
} from "../indexedDB/useIndexedDB";

export function useRewards() {
  return useQuery({
    queryKey: ["rewards"],
    queryFn: async () => {
      const localData = await loadRewardsFromDB();
      const lastSync = await getLastSyncTimeForRewards();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync).getTime();
        if (timeDiff < 1000 * 60 * 30) {
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        return localData;
      }

      const { data, error } = await supabase.from("rewards").select("*");
      if (error) throw error;

      if (data) {
        await saveRewardsToDB(data);
        await setLastSyncTimeForRewards(new Date().toISOString());
        return data;
      }

      return localData;
    },
    initialData: async () => {
      return await loadRewardsFromDB();
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    refetchOnWindowFocus: false
  });
}
