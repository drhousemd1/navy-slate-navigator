
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
    queryKey: [...RULES_QUERY_KEY],
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase.from('rules').delete().eq('id', ruleId);
      if (error) throw error;
      // No explicit data returned by Supabase delete, but mutationFn should resolve if successful
    },
    entityName: 'Rule',
    idField: 'id',
    onSuccessCallback: async (_data, ruleId, context) => { // Renamed from onSuccess; _data is void for delete
      console.log('[useDeleteRule onSuccessCallback] Rule deleted on server, updating IndexedDB for rule ID:', ruleId);
      // const deletedRuleTitle = (context?.optimisticItem as Rule)?.title || "Unknown Rule"; // optimisticItem might not be available directly here for delete
      try {
        const localRules = await loadRulesFromDB() || [];
        const updatedLocalRules = localRules.filter(r => r.id !== ruleId);
        await saveRulesToDB(updatedLocalRules);
        await setLastSyncTimeForRules(new Date().toISOString());
        console.log('[useDeleteRule onSuccessCallback] IndexedDB updated after deleting rule.');
        // Generic success toast is handled by useDeleteOptimisticMutation
        // toast({ title: "Rule Deleted", description: `Rule "${deletedRuleTitle}" has been successfully deleted and local data updated.` });
      } catch (error) {
        console.error('[useDeleteRule onSuccessCallback] Error updating IndexedDB:', error);
        toast({ variant: "destructive", title: "Local Update Error", description: "Rule deleted on server, but failed to update local data." });
      }
    },
    onError: (error, ruleId, context) => { // This onError is from useMutationOptions
      console.error('[useDeleteRule onError] Error deleting rule:', error, ruleId);
      // const deletedRuleTitle = (context?.previousData as Rule[])?.find(r => r.id === ruleId)?.title || "the rule";
      // Generic error toast is handled by useDeleteOptimisticMutation
      // toast({ variant: "destructive", title: "Rule Deletion Failed", description: `Could not delete ${deletedRuleTitle}. ${error.message}` });
    },
  });
};
