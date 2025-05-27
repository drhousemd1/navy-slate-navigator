
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
import { loadRulesFromDB, saveRulesToDB, setLastSyncTimeForRules } from '@/data/indexedDB/useIndexedDB';
import { RULES_QUERY_KEY } from '../queries';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger'; // Logger import should already be here or added if missing

export type UpdateRuleVariables = { id: string } & Partial<Omit<Rule, 'id'>>;

export const useUpdateRule = () => {
  const queryClient = useQueryClient();

  return useUpdateOptimisticMutation<Rule, Error, UpdateRuleVariables>({
    queryClient,
    queryKey: [...RULES_QUERY_KEY], // Ensure mutable array
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
    onSuccessCallback: async (updatedRuleData) => {
      logger.log('[useUpdateRule onSuccessCallback] Rule updated on server, updating IndexedDB.', updatedRuleData); // Replaced console.log
      try {
        const localRules = await loadRulesFromDB() || [];
        const updatedLocalRules = localRules.map(r => r.id === updatedRuleData.id ? updatedRuleData : r);
        await saveRulesToDB(updatedLocalRules);
        await setLastSyncTimeForRules(new Date().toISOString());
        logger.log('[useUpdateRule onSuccessCallback] IndexedDB updated with updated rule.'); // Replaced console.log
        // Generic success toast is handled by useUpdateOptimisticMutation
      } catch (error) {
        logger.error('[useUpdateRule onSuccessCallback] Error updating IndexedDB:', error); // Replaced console.error
        toast({ variant: "destructive", title: "Local Save Error", description: "Rule updated on server, but failed to save changes locally." });
      }
    },
    mutationOptions: { 
      // onError was here, it's removed as the optimistic hook handles it.
    }
  });
};

