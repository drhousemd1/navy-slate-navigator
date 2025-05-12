
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
import { PunishmentData } from "@/contexts/punishments/types";

export function usePunishments() {
  const query = useQuery({
    queryKey: ["punishments"],
    queryFn: async () => {
      const localData = await loadPunishmentsFromDB();
      const lastSync = await getLastSyncTimeForPunishments();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) {
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        return localData as PunishmentData[];
      }

      const { data, error } = await supabase.from("punishments").select("*");
      if (error) throw error;

      if (data) {
        await savePunishmentsToDB(data);
        await setLastSyncTimeForPunishments(new Date().toISOString());
        return data as PunishmentData[];
      }

      return (localData || []) as PunishmentData[];
    },
    initialData: async () => {
      return await loadPunishmentsFromDB() as PunishmentData[] | undefined;
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    refetchOnWindowFocus: false
  });

  // Add custom properties to the query object to be compatible with the expected interface
  // in the Punishments component
  return {
    ...query,
    punishments: query.data || [],
    refetchPunishments: query.refetch
  };
}
