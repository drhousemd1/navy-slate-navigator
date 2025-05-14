
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { usePersistentQuery as useQuery } from "./usePersistentQuery";
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
      const localData = await loadRewardsFromDB();
      const lastSync = await getLastSyncTimeForRewards();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData && (localData as any[]).length > 0) {
        console.log("[useRewards] Using cached local data, no fetch needed.", localData);
        return (localData as any[]).map(row => ({
          ...row,
          is_dom_reward: row.is_dominant // Ensure this mapping
        }));
      }
      
      console.log("[useRewards] Fetching data from Supabase or using stale local if fetch fails.");
      const { data, error } = await supabase.from("rewards").select("*");
      if (error) {
        console.error("[useRewards] Error fetching from Supabase:", error);
        // If Supabase fetch fails, return localData if available, otherwise throw
        if (localData && (localData as any[]).length > 0) {
          console.warn("[useRewards] Supabase fetch failed, returning stale local data.");
          return (localData as any[]).map(row => ({ ...row, is_dom_reward: row.is_dominant }));
        }
        throw error;
      }

      if (data) {
        console.log("[useRewards] Successfully fetched data from Supabase:", data);
        const processedData = (data as any[]).map(row => ({
          ...row,
          is_dom_reward: row.is_dominant // Ensure this mapping
        }));
        await saveRewardsToDB(processedData);
        await setLastSyncTimeForRewards(new Date().toISOString());
        return processedData;
      }
      
      // Fallback to localData if Supabase returns no data for some reason
      console.log("[useRewards] Supabase returned no data, falling back to local data if available.");
      return localData ? (localData as any[]).map(row => ({ ...row, is_dom_reward: row.is_dominant })) : [];
    },
    initialData: undefined, // Ensured to be undefined
    staleTime: 1000 * 60 * 5, // 5 minutes, was Infinity
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false
  });
}
