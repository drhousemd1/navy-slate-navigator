
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule'; // Rule type needed for context
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';
import { saveRulesToDB } from '@/data/indexedDB/useIndexedDB';
import { useAuth } from '@/contexts/auth';

export const useDeleteRule = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ['rules', user?.id];

  return useDeleteOptimisticMutation<Rule, Error, string>({ // TItem is Rule
    queryClient,
    queryKey: queryKey,
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', ruleId)
        .eq('user_id', user?.id || ''); // Ensure user can only delete their own rules
      if (error) throw error;
    },
    entityName: 'Rule',
    idField: 'id',
    onSuccessCallback: async () => {
      // After successful server deletion, re-fetch from cache and save to IDB
      const updatedRulesList = queryClient.getQueryData<Rule[]>(queryKey);
      if (updatedRulesList) {
        await saveRulesToDB(updatedRulesList);
      }
    }
  });
};
