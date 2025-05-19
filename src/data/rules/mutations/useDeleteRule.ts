
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule'; // Rule is used by generic type, keep if needed
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { loadRulesFromDB, saveRulesToDB, setLastSyncTimeForRules } from '@/data/indexedDB/useIndexedDB';
import { RULES_QUERY_KEY } from '../queries';

export const useDeleteRule = () => {
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<Rule, Error, string>({ // TVariables is string (ruleId)
    queryClient,
    queryKey: RULES_QUERY_KEY,
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase.from('rules').delete().eq('id', ruleId);
      if (error) throw error;
      // No explicit data returned by Supabase delete, but mutationFn should resolve if successful
    },
    entityName: 'Rule',
    idField: 'id',
    onSuccess: async (_data, ruleId) => { // _data is likely void/null, ruleId is from TVariables
      console.log('[useDeleteRule onSuccess] Rule deleted on server, updating IndexedDB for rule ID:', ruleId);
      try {
        const localRules = await loadRulesFromDB() || [];
        const updatedLocalRules = localRules.filter(r => r.id !== ruleId);
        await saveRulesToDB(updatedLocalRules);
        await setLastSyncTimeForRules(new Date().toISOString());
        console.log('[useDeleteRule onSuccess] IndexedDB updated after deleting rule.');
      } catch (error) {
        console.error('[useDeleteRule onSuccess] Error updating IndexedDB:', error);
      }
    },
  });
};
