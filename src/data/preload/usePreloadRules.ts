
import { loadRulesFromDB } from "../indexedDB/useIndexedDB";
import { queryClient } from "../queryClient";
import { RULES_QUERY_KEY } from "../rules/queries";
import { logger } from '@/lib/logger';
import { Rule } from "@/data/rules/types";
import { checkAndPerformRuleResets } from "@/lib/rulesUtils";

export function usePreloadRules() {
  return async (): Promise<null> => {
    try {
      // Check and perform rule resets before loading cached data
      // This ensures we don't load stale violation data
      await checkAndPerformRuleResets();

      const data = await loadRulesFromDB();
      if (data && Array.isArray(data) && data.length > 0) {
        queryClient.setQueryData(RULES_QUERY_KEY, data as Rule[]);
        logger.debug("[usePreloadRules] Rules data set to query cache:", data.length, "rules");
      } else {
        logger.debug("[usePreloadRules] No rules data found in IndexedDB or data is invalid");
      }
    } catch (error) {
      logger.error("[usePreloadRules] Error during rules preload:", error);
    }
    
    return null;
  };
}
