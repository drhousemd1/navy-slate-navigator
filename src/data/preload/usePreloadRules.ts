
import { currentWeekKey } from "@/lib/taskUtils";
import { resetRulesUsageData } from "@/lib/rulesUtils";
import { loadRulesFromDB } from "../indexedDB/useIndexedDB";
import { queryClient } from "../queryClient";
import { RULES_QUERY_KEY } from "../rules/queries";
import { logger } from '@/lib/logger';
import { Rule } from "@/data/rules/types";
import { useAuth } from '@/contexts/auth';

export function usePreloadRules() {
  const { user } = useAuth();
  
  return async (): Promise<null> => {
    // Check for weekly reset
    if (localStorage.getItem("lastWeek") !== currentWeekKey()) {
      if (user?.id) {
        try {
          await resetRulesUsageData(user.id);
          logger.debug('[usePreloadRules] Rules usage data reset for new week');
        } catch (error) {
          logger.error('[usePreloadRules] Error resetting rules usage data:', error);
        }
      }
      localStorage.setItem("lastWeek", currentWeekKey());
    }
    
    // Load from IndexedDB
    const data = await loadRulesFromDB();
    if (data && Array.isArray(data) && data.length > 0) {
      queryClient.setQueryData(RULES_QUERY_KEY, data as Rule[]);
      logger.debug("[usePreloadRules] Rules data set to query cache:", data.length, "rules");
    } else {
      logger.debug("[usePreloadRules] No rules data found in IndexedDB or data is invalid");
    }
    return null;
  };
}
