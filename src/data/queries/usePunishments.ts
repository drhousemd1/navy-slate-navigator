
/**
 * CENTRALIZED DATA LOGIC – DO NOT DUPLICATE OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query"; // Changed from usePersistentQuery
import { supabase } from '@/integrations/supabase/client';
import {
  loadPunishmentsFromDB,
  savePunishmentsToDB,
  getLastSyncTimeForPunishments,
  setLastSyncTimeForPunishments
} from "../indexedDB/useIndexedDB";
import { PunishmentData } from "@/contexts/punishments/types";

export function usePunishments() {
  const queryResult = useQuery<PunishmentData[], Error>({ // Explicitly type queryResult
    queryKey: ["punishments"],
    queryFn: async () => {
      const localData = await loadPunishmentsFromDB() as PunishmentData[] | null;
      const lastSync = await getLastSyncTimeForPunishments();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        return localData;
      }

      const { data, error } = await supabase.from("punishments").select("*");
      if (error) throw error;

      if (data) {
        const punishmentsData = data as PunishmentData[];
        await savePunishmentsToDB(punishmentsData);
        await setLastSyncTimeForPunishments(new Date().toISOString());
        return punishmentsData;
      }

      return localData || []; // Fallback to localData or empty array
    },
    // initialData: undefined, // Removed: Persister handles initial data hydration
    staleTime: Infinity,
    gcTime: 3600000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false
  });

  return {
    ...queryResult,
    punishments: queryResult.data || [],
    isLoading: queryResult.isLoading, // ensure isLoading is passed through
    error: queryResult.error, // ensure error is passed through
    refetchPunishments: queryResult.refetch
  };
}

