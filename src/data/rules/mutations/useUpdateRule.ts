
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
import { loadRulesFromDB, saveRulesToDB, setLastSyncTimeForRules } from '@/data/indexedDB/useIndexedDB';
import { RULES_QUERY_KEY } from '../queries';

export type UpdateRuleVariables = { id: string } & Partial<Omit<Rule, 'id'>>;

export const useUpdateRule = () => {
  const queryClient = useQueryClient();

  return useUpdateOptimisticMutation<Rule, Error, UpdateRuleVariables>({
    queryClient,
    queryKey: RULES_QUERY_KEY,
    mutationFn: async (variables: UpdateRuleVariables) => {
      const { id, ...updates } = variables;
      const { data, error } = await supabase
        .from('rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Rule update failed, no data returned.');
      return data as Rule;
    },
    entityName: 'Rule',
    idField: 'id',
    onSuccess: async (updatedRuleData) => {
      console.log('[useUpdateRule onSuccess] Rule updated on server, updating IndexedDB.', updatedRuleData);
      try {
        const localRules = await loadRulesFromDB() || [];
        const updatedLocalRules = localRules.map(r => r.id === updatedRuleData.id ? updatedRuleData : r);
        await saveRulesToDB(updatedLocalRules);
        await setLastSyncTimeForRules(new Date().toISOString());
        console.log('[useUpdateRule onSuccess] IndexedDB updated with updated rule.');
      } catch (error) {
        console.error('[useUpdateRule onSuccess] Error updating IndexedDB:', error);
      }
    },
  });
};
