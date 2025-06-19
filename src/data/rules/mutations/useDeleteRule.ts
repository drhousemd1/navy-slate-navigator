
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { loadRulesFromDB, saveRulesToDB, setLastSyncTimeForRules } from '@/data/indexedDB/useIndexedDB';
import { RULES_QUERY_KEY } from '../queries';
import { toastManager } from '@/lib/toastManager';
import { logger } from '@/lib/logger';
import { useUserIds } from '@/contexts/UserIdsContext';

export const useDeleteRule = () => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();

  return useDeleteOptimisticMutation<Rule, Error, string>({
    queryClient,
    queryKey: [...RULES_QUERY_KEY, subUserId, domUserId],
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase.from('rules').delete().eq('id', ruleId);
      if (error) throw error;
    },
    entityName: 'Rule',
    idField: 'id',
    suppressSuccessToast: true,
    onSuccessCallback: async (ruleId: string) => { 
      logger.debug('[useDeleteRule onSuccessCallback] Rule deleted on server, updating IndexedDB only for rule ID:', ruleId);
      try {
        const localRules = await loadRulesFromDB() || [];
        const updatedLocalRules = localRules.filter(r => r.id !== ruleId);
        await saveRulesToDB(updatedLocalRules);
        await setLastSyncTimeForRules(new Date().toISOString());
        logger.debug('[useDeleteRule onSuccessCallback] IndexedDB updated after deleting rule.');
      } catch (error) {
        logger.error('[useDeleteRule onSuccessCallback] Error updating IndexedDB:', error);
        toastManager.error("Local Update Error", "Rule deleted on server, but failed to update local data.");
      }
    }
  });
};
