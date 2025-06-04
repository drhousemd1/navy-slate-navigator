
import { useCallback } from 'react';
import { useRules } from '@/data/rules/queries';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { loadRulesFromDB } from '../indexedDB/useIndexedDB';
import { checkAndPerformRulesResets } from '@/lib/rulesUtils';
import { RULES_QUERY_KEY } from '@/data/rules/queries';

export const useRulesData = () => {
  const queryClient = useQueryClient();
  const { 
    data: rules = [], 
    isLoading, 
    error, 
    refetch,
    isUsingCachedData = false
  } = useRules();

  // Enhanced rules loading with reset check and complete cache invalidation
  const checkAndReloadRules = useCallback(async () => {
    try {
      logger.debug('[useRulesData] Checking for rules resets');
      
      const resetPerformed = await checkAndPerformRulesResets();
      
      if (resetPerformed) {
        logger.debug('[useRulesData] Resets performed, invalidating cache and reloading fresh data');
        
        // Force complete cache invalidation for rules
        await queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });
        
        // Reload fresh data from IndexedDB after resets
        const freshData = await loadRulesFromDB();
        
        if (freshData && Array.isArray(freshData)) {
          // Update React Query cache with fresh data
          queryClient.setQueryData(RULES_QUERY_KEY, freshData);
          logger.debug('[useRulesData] Updated cache with fresh reset data');
        }
        
        // Force a refetch to ensure we have the latest data from server
        await refetch();
      }
    } catch (error) {
      logger.error('[useRulesData] Error during reset check:', error);
    }
  }, [queryClient, refetch]);

  return {
    rules,
    isLoading,
    error,
    isUsingCachedData,
    refetch,
    checkAndReloadRules
  };
};
