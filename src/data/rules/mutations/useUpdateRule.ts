
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { useUpdateOptimisticMutation } from '@/lib/optimistic-mutations';

export type UpdateRuleVariables = { id: string } & Partial<Omit<Rule, 'id'>>;

export const useUpdateRule = () => {
  const queryClient = useQueryClient();

  return useUpdateOptimisticMutation<Rule, Error, UpdateRuleVariables>({
    queryClient,
    queryKey: ['rules'],
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
  });
};
