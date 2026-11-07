import { legacyQueryKey, readCacheSnapshot, requireCurrentCacheToken, captureCacheToken, type CacheToken } from '@/data/indexedDB/useIndexedDB';

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
  getLastSyncTimeForRules } from "../indexedDB/useIndexedDB";
import { logger } from '@/lib/logger';
import { useUserIds } from '@/contexts/UserIdsContext';

export const RULES_QUERY_KEY = ['rules'];

export function useRules() {
  const cacheToken = captureCacheToken();
  const { subUserId, domUserId } = useUserIds();

  return useQuery<Rule[], Error, Rule[]>({
    queryKey: legacyQueryKey(RULES_QUERY_KEY, cacheToken),
    queryFn: async (): Promise<Rule[]> => {
      if (!subUserId && !domUserId) {
        logger.debug('[useRules queryFn] No user IDs provided, returning empty array');
        return [];
      }

      const snapshot = await readCacheSnapshot<Rule[]>('rules', cacheToken);
      const localData = snapshot?.data ?? null;
      const lastSync = snapshot?.savedAt ?? null;
      let shouldFetch = true;

      if (lastSync) {
        const timeDiff = Date.now() - new Date(lastSync as string).getTime();
        if (timeDiff < 1000 * 60 * 30) { // 30 minutes
          shouldFetch = false;
        }
      }

      if (!shouldFetch && localData) {
        logger.debug('[useRules queryFn] Using local data for rules.');
        requireCurrentCacheToken(cacheToken);
        return localData;
      }

      logger.debug('[useRules queryFn] Fetching rules from server.');
      const serverData: Rule[] = await fetchRulesFromServer(subUserId, domUserId, cacheToken);

      if (serverData) {
        try { await saveRulesToDB(serverData, cacheToken); } catch (error) { requireCurrentCacheToken(cacheToken); logger.warn('Server data loaded, but the device snapshot could not be saved.', error); }

        logger.debug('[useRules queryFn] Saved server rules to DB and updated sync time.');
        requireCurrentCacheToken(cacheToken);
        return serverData;
      }

      logger.debug('[useRules queryFn] No server data, returning local data or empty array for rules.');
      requireCurrentCacheToken(cacheToken);
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
