
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
import { saveRulesToDB, loadRulesFromDB } from '@/data/indexedDB/useIndexedDB';
import { useAuth } from '@/contexts/auth';

// Ensure CreateRuleVariables matches the actual structure needed for rule creation
// Omitting id, created_at, updated_at, usage_data, user_id (user_id will be added)
export type CreateRuleVariables = Omit<Partial<Rule>, 'id' | 'created_at' | 'updated_at' | 'usage_data' | 'user_id'> & {
  title: string; // title is mandatory
  priority: 'low' | 'medium' | 'high';
  frequency: 'daily' | 'weekly';
  frequency_count: number;
};

export const useCreateRule = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useCreateOptimisticMutation<Rule, Error, CreateRuleVariables>({
    queryClient,
    queryKey: ['rules', user?.id],
    mutationFn: async (variables: CreateRuleVariables) => {
      if (!user?.id) throw new Error("User not authenticated");
      const ruleToInsert = {
        ...variables,
        user_id: user.id,
        // Ensure all required fields for the 'rules' table are provided
        // Default values for non-nullable fields if not in variables:
        title_color: variables.title_color || '#FFFFFF',
        background_opacity: variables.background_opacity || 100,
        highlight_effect: variables.highlight_effect || false,
        focal_point_x: variables.focal_point_x || 50,
        focal_point_y: variables.focal_point_y || 50,
        subtext_color: variables.subtext_color || '#FFFFFF',
        calendar_color: variables.calendar_color || '#9c7abb',
        icon_color: variables.icon_color || '#FFFFFF',
      };
      const { data, error } = await supabase
        .from('rules')
        .insert(ruleToInsert)
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
        user_id: user?.id || '', // Optimistic user_id
        created_at: now,
        updated_at: now,
        usage_data: [], // Default for new rules
        title_color: '#FFFFFF',
        background_opacity: 100,
        highlight_effect: false,
        focal_point_x: 50,
        focal_point_y: 50,
        subtext_color: '#FFFFFF',
        calendar_color: '#9c7abb',
        icon_color: '#FFFFFF',
        ...variables, // Spread incoming variables
      } as Rule;
    },
    onSuccessCallback: async (data) => {
      const currentRules = await loadRulesFromDB() || [];
      const updatedRules = [data, ...currentRules.filter(rule => rule.id !== data.id)];
      await saveRulesToDB(updatedRules);
    }
  });
};
