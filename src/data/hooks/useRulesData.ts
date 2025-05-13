
import { usePersistentQuery as useQuery } from '@/data/queries/usePersistentQuery';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Rule } from '@/data/interfaces/Rule';
import { fetchRules } from '@/data/rules/fetchRules';
import { saveRuleToDb } from '@/data/rules/saveRule';
import { deleteRuleFromDb } from '@/data/rules/deleteRule';
import { recordRuleViolationInDb } from '@/data/rules/recordViolation';
import { getMondayBasedDay } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { STANDARD_QUERY_CONFIG, logQueryPerformance } from '@/lib/react-query-config';

// Keys for queries
const RULES_QUERY_KEY = ['rules'];

export const useRulesData = () => {
  const queryClient = useQueryClient();

  // Query for fetching all rules - NOW USING STANDARD_QUERY_CONFIG
  const {
    data: rules = [],
    isLoading,
    error,
    refetch: refetchRules
  } = useQuery({
    queryKey: RULES_QUERY_KEY,
    queryFn: fetchRules,
    ...STANDARD_QUERY_CONFIG
  });

  // Mutation for saving a rule (create or update)
  const saveRuleMutation = useMutation({
    mutationFn: saveRuleToDb,
    onMutate: async (newRule) => {
      await queryClient.cancelQueries({ queryKey: RULES_QUERY_KEY });
      const previousRules = queryClient.getQueryData<Rule[]>(RULES_QUERY_KEY) || [];

      if (newRule.id) {
        queryClient.setQueryData<Rule[]>(
          RULES_QUERY_KEY,
          previousRules.map(r =>
            r.id === newRule.id
              ? { ...r, ...newRule, updated_at: new Date().toISOString() }
              : r
          )
        );
      } else {
        // Generate a proper UUID for optimistic updates instead of temp-timestamp
        const tempId = uuidv4();
        const optimisticRule: Rule = {
          id: tempId,
          title: newRule.title || 'New Rule',
          description: newRule.description || '',
          priority: newRule.priority || 'medium',
          background_image_url: newRule.background_image_url,
          background_opacity: newRule.background_opacity || 100,
          icon_url: newRule.icon_url,
          icon_name: newRule.icon_name,
          title_color: newRule.title_color || '#FFFFFF',
          subtext_color: newRule.subtext_color || '#FFFFFF',
          calendar_color: newRule.calendar_color || '#9c7abb',
          icon_color: newRule.icon_color || '#FFFFFF',
          highlight_effect: newRule.highlight_effect || false,
          focal_point_x: newRule.focal_point_x || 50,
          focal_point_y: newRule.focal_point_y || 50,
          frequency: newRule.frequency || 'daily',
          frequency_count: newRule.frequency_count || 3,
          usage_data: [0, 0, 0, 0, 0, 0, 0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        queryClient.setQueryData<Rule[]>(
          RULES_QUERY_KEY,
          [optimisticRule, ...previousRules]
        );
      }

      return { previousRules };
    },
    onError: (err, newRule, context) => {
      console.error('Error saving rule:', err);
      toast({
        title: 'Error',
        description: 'Failed to save rule. Please try again.',
        variant: 'destructive',
      });

      if (context) {
        queryClient.setQueryData(RULES_QUERY_KEY, context.previousRules);
      }
    },
    onSuccess: (savedRule) => {
      toast({
        title: 'Success',
        description: `Rule ${savedRule.id ? 'updated' : 'created'} successfully!`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });
    }
  });

  // Mutation for deleting a rule
  const deleteRuleMutation = useMutation({
    mutationFn: deleteRuleFromDb,
    onMutate: async (ruleId) => {
      await queryClient.cancelQueries({ queryKey: RULES_QUERY_KEY });
      const previousRules = queryClient.getQueryData<Rule[]>(RULES_QUERY_KEY) || [];

      queryClient.setQueryData<Rule[]>(
        RULES_QUERY_KEY,
        previousRules.filter(r => r.id !== ruleId)
      );

      return { previousRules };
    },
    onError: (err, ruleId, context) => {
      console.error('Error deleting rule:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete rule. Please try again.',
        variant: 'destructive',
      });

      if (context) {
        queryClient.setQueryData(RULES_QUERY_KEY, context.previousRules);
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Rule deleted successfully!',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });
    }
  });

  // Mutation for marking a rule as broken
  const markRuleBrokenMutation = useMutation({
    mutationFn: recordRuleViolationInDb,
    onMutate: async (rule) => {
      await queryClient.cancelQueries({ queryKey: RULES_QUERY_KEY });
      const previousRules = queryClient.getQueryData<Rule[]>(RULES_QUERY_KEY) || [];
      const currentDay = getMondayBasedDay();

      const updatedRules = previousRules.map(r => {
        if (r.id === rule.id) {
          const updatedUsageData = [...(r.usage_data || Array(7).fill(0))];
          updatedUsageData[currentDay] = 1;
          return { ...r, usage_data: updatedUsageData };
        }
        return r;
      });

      queryClient.setQueryData(RULES_QUERY_KEY, updatedRules);

      return { previousRules };
    },
    onError: (err, rule, context) => {
      console.error('Error marking rule as broken:', err);
      toast({
        title: 'Error',
        description: 'Failed to record rule violation. Please try again.',
        variant: 'destructive',
      });

      if (context) {
        queryClient.setQueryData(RULES_QUERY_KEY, context.previousRules);
      }
    },
    onSuccess: () => {
      toast({ 
        title: 'Rule Broken', 
        description: 'This violation has been recorded.' 
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });
    }
  });

  return {
    rules,
    isLoading,
    error,
    saveRule: (ruleData: Partial<Rule>) => saveRuleMutation.mutateAsync(ruleData),
    deleteRule: (ruleId: string) => deleteRuleMutation.mutateAsync(ruleId),
    markRuleBroken: (rule: Rule) => markRuleBrokenMutation.mutateAsync(rule),
    refetchRules
  };
};
