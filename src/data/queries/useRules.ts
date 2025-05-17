
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query"; // Changed from usePersistentQuery
import { supabase } from '@/integrations/supabase/client';
import { Rule } from "@/data/interfaces/Rule"; // Ensure Rule interface is correct
import {
  loadRulesFromDB,
  saveRulesToDB,
  getLastSyncTimeForRules,
  setLastSyncTimeForRules
} from "../indexedDB/useIndexedDB";

export function useRules() {
  return useQuery<Rule[], Error>({ // Specify Rule[] type
    queryKey: ["rules"],
    queryFn: async () => {
      const localData = await loadRulesFromDB() as Rule[] | null;
      const lastSync = await getLastSyncTimeForRules();
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

      const { data, error } = await supabase.from("rules").select("*");
      if (error) throw error;

      if (data) {
        const rulesData = data as Rule[];
        await saveRulesToDB(rulesData);
        await setLastSyncTimeForRules(new Date().toISOString());
        return rulesData;
      }

      return localData || []; // Fallback to localData or empty array
    },
    // initialData: undefined, // Removed: Persister handles initial data hydration
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

