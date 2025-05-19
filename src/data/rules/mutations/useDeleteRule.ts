
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { loadRulesFromDB, saveRulesToDB, setLastSyncTimeForRules } from '@/data/indexedDB/useIndexedDB';
import { RULES_QUERY_KEY } from '../queries';
import { toast } from '@/hooks/use-toast';

export const useDeleteRule = () => {
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<Rule, Error, string>({
    queryClient,
    queryKey: [...RULES_QUERY_KEY], // Ensure mutable array
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase.from('rules').delete().eq('id', ruleId);
      if (error) throw error;
      // No explicit data returned by Supabase delete, but mutationFn should resolve if successful
    },
    entityName: 'Rule',
    idField: 'id',
    onSuccessCallback: async (ruleId: string) => { 
      console.log('[useDeleteRule onSuccessCallback] Rule deleted on server, updating IndexedDB for rule ID:', ruleId);
      try {
        const localRules = await loadRulesFromDB() || [];
        const updatedLocalRules = localRules.filter(r => r.id !== ruleId);
        await saveRulesToDB(updatedLocalRules);
        await setLastSyncTimeForRules(new Date().toISOString());
        console.log('[useDeleteRule onSuccessCallback] IndexedDB updated after deleting rule.');
        // Generic success toast is handled by useDeleteOptimisticMutation
      } catch (error) {
        console.error('[useDeleteRule onSuccessCallback] Error updating IndexedDB:', error);
        toast({ variant: "destructive", title: "Local Update Error", description: "Rule deleted on server, but failed to update local data." });
      }
    },
    mutationOptions: { 
      // onError was here, it's removed as the optimistic hook handles it.
      // The generic error toast is handled by useDeleteOptimisticMutation.
      // Specific console logging like:
      // console.error('[useDeleteRule onError] Error deleting rule:', error, ruleId);
      // is now omitted.
    }
  });
};
