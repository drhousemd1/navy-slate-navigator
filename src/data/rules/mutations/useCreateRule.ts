
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';

export type CreateRuleVariables = Partial<Omit<Rule, 'id' | 'created_at' | 'updated_at' | 'usage_data'>> & {
  title: string;
  // Add other non-optional fields from Rule if not already covered
};

export const useCreateRule = () => {
  const queryClient = useQueryClient();

  return useCreateOptimisticMutation<Rule, Error, CreateRuleVariables>({
    queryClient,
    queryKey: ['rules'],
    mutationFn: async (variables: CreateRuleVariables) => {
      const { data, error } = await supabase
        .from('rules')
        .insert({ ...variables })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Rule creation failed, no data returned.');
      return data as Rule;
    },
    entityName: 'Rule',
    createOptimisticItem: (variables, optimisticId) => {
      const now = new Date().toISOString();
      return {
        id: optimisticId,
        created_at: now,
        updated_at: now,
        usage_data: [], // Default for new rules
        // Default values based on schema
        title_color: '#FFFFFF',
        background_opacity: 100,
        highlight_effect: false,
        focal_point_x: 50,
        focal_point_y: 50,
        frequency_count: 3,
        subtext_color: '#FFFFFF',
        calendar_color: '#9c7abb',
        icon_color: '#FFFFFF',
        frequency: 'daily',
        priority: 'medium',
        ...variables,
      } as Rule;
    },
  });
};
