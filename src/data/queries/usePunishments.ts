
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import {
  loadPunishmentsFromDB,
  savePunishmentsToDB,
  getLastSyncTimeForPunishments,
  setLastSyncTimeForPunishments
} from "../indexedDB/useIndexedDB";

export function usePunishments() {
  return useQuery({
    queryKey: ["punishments"],
    queryFn: async () => {
      const localData = await loadPunishmentsFromDB();
      const lastSync = await getLastSyncTimeForPunishments();
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

      const { data, error } = await supabase.from("punishments").select("*");
      if (error) throw error;

      if (data) {
        await savePunishmentsToDB(data);
        await setLastSyncTimeForPunishments(new Date().toISOString());
        return data;
      }

      return localData;
    },
    initialData: async () => {
      return await loadPunishmentsFromDB();
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    refetchOnWindowFocus: false
  });
}
