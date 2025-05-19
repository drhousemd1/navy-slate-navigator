
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { Rule } from "@/data/interfaces/Rule";
import { fetchRules as fetchRulesFromServer } from "@/data/rules/fetchRules"; // Renamed import for clarity
import {
  loadRulesFromDB,
  saveRulesToDB,
  getLastSyncTimeForRules,
  setLastSyncTimeForRules
} from "../indexedDB/useIndexedDB"; // Adjusted path
import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager';

export const RULES_QUERY_KEY = CRITICAL_QUERY_KEYS.RULES;

export function useRules() {
  return useQuery<Rule[], Error>({
    queryKey: RULES_QUERY_KEY,
    queryFn: async () => {
      const localData = await loadRulesFromDB();
      const lastSync = await getLastSyncTimeForRules();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        console.log('[useRules queryFn] Using local data for rules.');
        return localData;
      }

      console.log('[useRules queryFn] Fetching rules from server.');
      const serverData = await fetchRulesFromServer(); // Use the imported fetchRules

      if (serverData) {
        await saveRulesToDB(serverData);
        await setLastSyncTimeForRules(new Date().toISOString());
        console.log('[useRules queryFn] Saved server rules to DB and updated sync time.');
        return serverData;
      }
      
      console.log('[useRules queryFn] No server data, returning local data or empty array for rules.');
      return localData || [];
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}
