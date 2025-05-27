
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
    logger.debug('[PreloadPunishments] Attempting to load punishments from IndexedDB...'); // Replaced console.log with logger.debug
    try {
      const data = await loadPunishmentsFromDB();
      if (data && Array.isArray(data) && data.length > 0) {
        queryClient.setQueryData(PUNISHMENTS_QUERY_KEY, data);
        logger.debug(`[PreloadPunishments] Successfully preloaded ${data.length} punishments into query cache.`); // Replaced console.log with logger.debug
      } else {
        logger.debug('[PreloadPunishments] No punishments found in IndexedDB or data was empty.'); // Replaced console.log with logger.debug
      }
    } catch (error) {
      logger.error('[PreloadPunishments] Error loading punishments from IndexedDB:', error); // Replaced console.error
    }
    return null;
  };
}
