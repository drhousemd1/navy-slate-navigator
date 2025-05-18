
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { useDeleteOptimisticMutation } from '@/lib/optimistic-mutations';

export const useDeleteRule = () => {
  const queryClient = useQueryClient();

  return useDeleteOptimisticMutation<Rule, Error, string>({
    queryClient,
    queryKey: ['rules'],
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase.from('rules').delete().eq('id', ruleId);
      if (error) throw error;
    },
    entityName: 'Rule',
    idField: 'id',
  });
};
