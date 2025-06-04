
import { currentWeekKey } from "@/lib/taskUtils";
import { resetPunishmentsUsageData } from "@/lib/punishmentsUtils";
import { loadPunishmentsFromDB } from "../indexedDB/useIndexedDB";
import { queryClient } from "../queryClient";
import { PUNISHMENTS_QUERY_KEY } from "@/data/punishments/queries";
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/auth';

export function usePreloadPunishments() {
  const { user } = useAuth();
  
  return async () => {
    // Check for weekly reset
    if (localStorage.getItem("lastWeek") !== currentWeekKey()) {
      if (user?.id) {
        try {
          await resetPunishmentsUsageData(user.id);
          logger.debug('[usePreloadPunishments] Punishments usage data reset for new week');
        } catch (error) {
          logger.error('[usePreloadPunishments] Error resetting punishments usage data:', error);
        }
      }
      localStorage.setItem("lastWeek", currentWeekKey());
    }
    
    logger.debug('[PreloadPunishments] Attempting to load punishments from IndexedDB...');
    try {
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
