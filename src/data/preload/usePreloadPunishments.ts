
import { loadPunishmentsFromDB } from "../indexedDB/useIndexedDB";
import { queryClient } from "../queryClient";
import { PUNISHMENTS_QUERY_KEY } from "@/data/punishments/queries";
import { logger } from '@/lib/logger';
import { checkAndPerformPunishmentsResets } from "@/lib/punishmentsUtils";

export function usePreloadPunishments() {
  return async () => {
    try {
      // Check and perform resets if needed
      await checkAndPerformPunishmentsResets();
      
      logger.debug('[PreloadPunishments] Attempting to load punishments from IndexedDB...');
      const data = await loadPunishmentsFromDB();
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
