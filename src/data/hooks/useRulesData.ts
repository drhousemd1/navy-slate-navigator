import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Rule } from '@/data/interfaces/Rule';
import { fetchRules } from '@/data/rules/fetchRules';
import { saveRuleToDb } from '@/data/rules/saveRule';
import { deleteRuleFromDb } from '@/data/rules/deleteRule';
import { recordRuleViolationInDb } from '@/data/rules/recordViolation';
import { getMondayBasedDay } from '@/lib/utils';

// Keys for queries
const RULES_QUERY_KEY = ['rules'] as const;
const RULE_VIOLATIONS_QUERY_KEY = ['rule-violations'] as const;

// Fetch violations separately to avoid refetching everything
const fetchRuleViolations = async () => {
  const { data: violations, error } = await supabase
    .from('rule_violations')
    .select('*')
    .order('violation_date', { ascending: false });

  if (error) throw error;
  return violations || [];
};

export const useRulesData = () => {
  const queryClient = useQueryClient();

  // Main rules query with aggressive caching
  const {
    data: rules = [],
    isLoading: rulesLoading,
    error: rulesError
  } = useQuery({
    queryKey: RULES_QUERY_KEY,
    queryFn: fetchRules,
    staleTime: 1000 * 60 * 20, // 20 minutes
    gcTime: 1000 * 60 * 30,    // 30 minutes
    refetchOnWindowFocus: false,
  });

  // Separate query for violations with its own caching strategy
  const {
    data: violations = [],
    isLoading: violationsLoading,
    error: violationsError
  } = useQuery({
    queryKey: RULE_VIOLATIONS_QUERY_KEY,
    queryFn: fetchRuleViolations,
    staleTime: 1000 * 60 * 20, // 20 minutes
    gcTime: 1000 * 60 * 30,    // 30 minutes
    refetchOnWindowFocus: false,
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
        const tempId = `temp-${Date.now()}`;
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
    isLoading: rulesLoading || violationsLoading,
    error: rulesError || violationsError,
    saveRule: (ruleData: Partial<Rule>) => saveRuleMutation.mutateAsync(ruleData),
    deleteRule: (ruleId: string) => deleteRuleMutation.mutateAsync(ruleId),
    markRuleBroken: (rule: Rule) => markRuleBrokenMutation.mutateAsync(rule),
    refetchRules: () => {
      queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: RULE_VIOLATIONS_QUERY_KEY });
    }
  };
};
