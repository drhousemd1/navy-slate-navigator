
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';
import { saveRulesToDB, loadRulesFromDB } from '@/data/indexedDB/useIndexedDB';
import { useAuth } from '@/contexts/auth';

export type UpdateRuleVariables = { id: string } & Partial<Omit<Rule, 'id' | 'created_at' | 'user_id'>>;

export const useUpdateRule = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useUpdateOptimisticMutation<Rule, Error, UpdateRuleVariables>({
    queryClient,
    queryKey: ['rules', user?.id],
    mutationFn: async (variables: UpdateRuleVariables) => {
      const { id, ...updates } = variables;
      // user_id should not be updatable by client in this mutation
      const { user_id, created_at, ...safeUpdates } = updates; 
      const { data, error } = await supabase
        .from('rules')
        .update({ ...safeUpdates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user?.id || '') // Ensure user can only update their own rules
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Rule update failed, no data returned.');
      return data as Rule;
    },
    entityName: 'Rule',
    idField: 'id',
    onSuccessCallback: async (data) => {
      const currentRules = await loadRulesFromDB() || [];
      const updatedRules = currentRules.map(rule => rule.id === data.id ? data : rule);
      await saveRulesToDB(updatedRules);
    }
  });
};
