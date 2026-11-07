import { captureCacheToken, readResetMarker, writeResetMarker, type CacheToken } from '@/data/indexedDB/useIndexedDB';

import { currentWeekKey, resetTaskCompletions } from "@/lib/taskUtils";
import { loadPunishmentsFromDB } from "../indexedDB/useIndexedDB";
import { queryClient } from "../queryClient";
import { PUNISHMENTS_QUERY_KEY } from "@/data/punishments/queries";
import { logger } from '@/lib/logger';

export function usePreloadPunishments() {
  const cacheToken = captureCacheToken();
  return async () => {
    if (await readResetMarker('taskWeekly', cacheToken) !== currentWeekKey()) {
      await resetTaskCompletions("weekly", cacheToken);
      await writeResetMarker('taskWeekly', currentWeekKey(), cacheToken);
    }
    logger.debug('[PreloadPunishments] Attempting to load punishments from IndexedDB...');
    try {
      const data = await loadPunishmentsFromDB(cacheToken);
      if (data && Array.isArray(data) && data.length > 0) {
        queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, data);
        logger.debug(`[PreloadPunishments] Successfully preloaded ${data.length} punishments into query cache.`);
      } else {
        logger.debug('[PreloadPunishments] No punishments found in IndexedDB or data was empty.');
      }
    } catch (error) {
      logger.error('[PreloadPunishments] Error loading punishments from IndexedDB:', error);
    }
    return null;
  };
}
