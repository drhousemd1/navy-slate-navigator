
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
import { RuleViolation, CreateRuleViolationVariables } from '@/data/rules/types';
import { getISOWeekString } from '@/lib/dateUtils';
import { useUserIds } from '@/contexts/UserIdsContext';

export const RULE_VIOLATIONS_QUERY_KEY = 'rule_violations';

export const useCreateRuleViolation = () => {
  const queryClient = useQueryClient();
  const { subUserId } = useUserIds();

  return useCreateOptimisticMutation<RuleViolation, Error, CreateRuleViolationVariables>({
    queryClient,
    queryKey: [RULE_VIOLATIONS_QUERY_KEY],
    mutationFn: async (variables: CreateRuleViolationVariables) => {
      if (!subUserId) {
        throw new Error("User not authenticated");
      }

      const now = new Date();
      const violationData = {
        rule_id: variables.rule_id,
        violation_date: now.toISOString(),
        day_of_week: now.getDay(),
        week_number: getISOWeekString(now),
        user_id: subUserId,
      };
      const { data, error } = await supabase
        .from('rule_violations')
        .insert(violationData)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Rule violation creation failed, no data returned.');
      return data as RuleViolation;
    },
    entityName: 'Rule Violation',
    createOptimisticItem: (variables, optimisticId) => {
      const now = new Date();
      return {
        id: optimisticId,
        rule_id: variables.rule_id,
        violation_date: now.toISOString(),
        day_of_week: now.getDay(),
        week_number: getISOWeekString(now),
        user_id: subUserId!,
        // created_at is handled by DB but good to have for optimistic item consistency if type includes it
      } as RuleViolation;
    },
  });
};
