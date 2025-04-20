import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRules,
  createRule,
  updateRule,
  deleteRule,
  recordRuleViolation
} from './rules/api';
import { Rule, RULES_KEY } from './rules/types';
import { toast } from '@/hooks/use-toast';
import { getMondayBasedDay } from '@/lib/utils';

export const useRulesQuery = () => {
  const queryClient = useQueryClient();

  const {
    data: rules = [],
    isLoading,
    error
  } = useQuery({
    queryKey: [RULES_KEY],
    queryFn: fetchRules,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const createRuleMutation = useMutation({
    mutationFn: createRule,
    onSuccess: (newRule) => {
      queryClient.setQueryData(
        [RULES_KEY],
        (oldData: Rule[] = []) => [newRule, ...oldData]
      );
      toast({
        title: 'Success',
        description: 'Rule created successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create rule. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: updateRule,
    onMutate: async (updatedRule) => {
      await queryClient.cancelQueries({ queryKey: [RULES_KEY] });
      const previousRules = queryClient.getQueryData<Rule[]>([RULES_KEY]) || [];
      queryClient.setQueryData(
        [RULES_KEY],
        (oldData: Rule[] = []) =>
          oldData.map(rule => rule.id === updatedRule.id ? { ...rule, ...updatedRule } : rule)
      );
      return { previousRules };
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Rule updated successfully',
      });
    },
    onError: (error, _, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData([RULES_KEY], context.previousRules);
      }
      toast({
        title: 'Error',
        description: 'Failed to update rule. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [RULES_KEY] });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: deleteRule,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [RULES_KEY] });
      const previousRules = queryClient.getQueryData<Rule[]>([RULES_KEY]) || [];
      queryClient.setQueryData(
        [RULES_KEY],
        (oldData: Rule[] = []) => oldData.filter(rule => rule.id !== id)
      );
      return { previousRules };
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Rule deleted successfully',
      });
    },
    onError: (error, _, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData([RULES_KEY], context.previousRules);
      }
      toast({
        title: 'Error',
        description: 'Failed to delete rule. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [RULES_KEY] });
    }
  });

  const recordViolationMutation = useMutation({
    mutationFn: recordRuleViolation,
    onMutate: async (ruleId) => {
      await queryClient.cancelQueries({ queryKey: [RULES_KEY] });
      const previousRules = queryClient.getQueryData<Rule[]>([RULES_KEY]) || [];
      queryClient.setQueryData(
        [RULES_KEY],
        (oldData: Rule[] = []) => oldData.map(rule => {
          if (rule.id !== ruleId) return rule;
          const currentDayOfWeek = getMondayBasedDay();
          const newUsageData = [...(rule.usage_data || [0, 0, 0, 0, 0, 0, 0])];
          newUsageData[currentDayOfWeek] = 1;
          return { ...rule, usage_data: newUsageData };
        })
      );
      return { previousRules };
    },
    onSuccess: () => {
      toast({
        title: 'Rule Broken',
        description: 'This violation has been recorded.',
      });
    },
    onError: (error, _, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData([RULES_KEY], context.previousRules);
      }
      toast({
        title: 'Error',
        description: 'Failed to record rule violation. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [RULES_KEY] });
    }
  });

  return {
    rules,
    isLoading,
    error: error ? (error as Error) : null,
    createRule: (data: Partial<Rule>) => createRuleMutation.mutateAsync(data),
    updateRule: (data: Partial<Rule>) => updateRuleMutation.mutateAsync(data),
    deleteRule: (id: string) => deleteRuleMutation.mutateAsync(id),
    recordViolation: (ruleId: string) => recordViolationMutation.mutateAsync(ruleId),
    refreshRules: () => queryClient.invalidateQueries({ queryKey: [RULES_KEY] })
  };
};
