
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { Rule } from "@/data/interfaces/Rule"; 
import { fetchRules as fetchRulesFromServer } from "@/data/rules/fetchRules";
import {
  loadRulesFromDB,
  saveRulesToDB,
  getLastSyncTimeForRules,
  setLastSyncTimeForRules
} from "../indexedDB/useIndexedDB";
import { logger } from '@/lib/logger';
import { useUserIds } from '@/contexts/UserIdsContext';

export const RULES_QUERY_KEY = ['rules'];

export function useRules() {
  const { subUserId, domUserId } = useUserIds();
  
  return useQuery<Rule[], Error, Rule[]>({ 
    queryKey: [...RULES_QUERY_KEY, subUserId, domUserId],
    queryFn: async (): Promise<Rule[]> => { 
      if (!subUserId && !domUserId) {
        logger.debug('[useRules queryFn] No user IDs provided, returning empty array');
        return [];
      }

      const localData: Rule[] | null = await loadRulesFromDB();
      const lastSync = await getLastSyncTimeForRules();
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        logger.debug('[useRules queryFn] Using local data for rules.');
        return localData;
      }

      logger.debug('[useRules queryFn] Fetching rules from server.');
      const serverData: Rule[] = await fetchRulesFromServer(subUserId, domUserId);

      if (serverData) {
        await saveRulesToDB(serverData);
        await setLastSyncTimeForRules(new Date().toISOString());
        logger.debug('[useRules queryFn] Saved server rules to DB and updated sync time.');
        return serverData;
      }
      
      logger.debug('[useRules queryFn] No server data, returning local data or empty array for rules.');
      return localData || [];
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    gcTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!(subUserId || domUserId), // Only run if we have at least one user ID
  });
}
