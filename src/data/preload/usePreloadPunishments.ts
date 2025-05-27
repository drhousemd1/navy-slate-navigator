
import { currentWeekKey, resetTaskCompletions } from "@/lib/taskUtils";
import { loadPunishmentsFromDB } from "../indexedDB/useIndexedDB";
import { queryClient } from "../queryClient";
import { PUNISHMENTS_QUERY_KEY } from "@/data/punishments/queries";
import { logger } from '@/lib/logger'; // Added logger import

export function usePreloadPunishments() {
  return async () => {
    if (localStorage.getItem("lastWeek") !== currentWeekKey()) {
      await resetTaskCompletions("weekly");
      localStorage.setItem("lastWeek", currentWeekKey());
    }
    logger.log('[PreloadPunishments] Attempting to load punishments from IndexedDB...'); // Replaced console.log
    try {
      const data = await loadPunishmentsFromDB();
      if (data && Array.isArray(data) && data.length > 0) {
        queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, data);
        logger.log(`[PreloadPunishments] Successfully preloaded ${data.length} punishments into query cache.`); // Replaced console.log
      } else {
        logger.log('[PreloadPunishments] No punishments found in IndexedDB or data was empty.'); // Replaced console.log
      }
    } catch (error) {
      logger.error('[PreloadPunishments] Error loading punishments from IndexedDB:', error); // Replaced console.error
    }
    return null;
  };
}

