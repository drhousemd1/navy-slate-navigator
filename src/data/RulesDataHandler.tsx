import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saveRule, deleteRule } from '@/data/rules/saveRule';
import { fetchRules } from '@/data/rules/fetchRules';
import { recordRuleViolation } from '@/data/rules/recordViolation';
import { Rule } from '@/data/interfaces/Rule';
import { UseQueryResult, QueryObserverResult } from '@tanstack/react-query';

export type RulesQueryResult = {
  rules: Rule[]; 
  isLoading: boolean;
  error: Error | null;
  isUsingCachedData: boolean;
  saveRule: (ruleData: Partial<Rule>) => Promise<Rule>;
  deleteRule: (ruleId: string) => Promise<void>;
  markRuleBroken: (rule: Rule) => Promise<void>;
  refetchRules: () => Promise<QueryObserverResult<Rule[], Error>>;
};

export const useRulesData = (): RulesQueryResult => {
  const queryClient = useQueryClient();
  
  const { 
    data: rules = [], 
    isLoading,
    error,
    refetch
  } = useQuery<Rule[], Error>({
    queryKey: ['rules'],
    queryFn: fetchRules
  });

  // Determine if using cached data based on error state and data presence
  const isUsingCachedData = !!error && rules && rules.length > 0;

  const saveRuleMutation = useMutation(
    (ruleData: Partial<Rule>) => saveRule(ruleData),
    {
      onSuccess: (newRule) => {
        // Directly update the rules array in the cache
        queryClient.setQueryData<Rule[]>(['rules'], (oldRules) => {
          if (oldRules) {
            return [...oldRules.filter(rule => rule.id !== newRule.id), newRule];
          }
          return [newRule];
        });
      },
      onError: (err) => {
        console.error("Error saving rule:", err);
      },
    }
  );

  const deleteRuleMutation = useMutation(
    (ruleId: string) => deleteRule(ruleId),
    {
      onSuccess: (ruleId) => {
        // Optimistically update the cache
        queryClient.setQueryData<Rule[]>(['rules'], (oldRules) =>
          oldRules ? oldRules.filter((rule) => rule.id !== ruleId) : []
        );
      },
      onError: (err) => {
        console.error("Error deleting rule:", err);
      },
    }
  );

  const markRuleViolationMutation = useMutation(
    (rule: Rule) => recordRuleViolation(rule),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['rules']);
      },
      onError: (err) => {
        console.error("Error marking rule as broken:", err);
      },
    }
  );

  const saveRuleWrapper = async (ruleData: Partial<Rule>): Promise<Rule> => {
    return await saveRuleMutation.mutateAsync(ruleData);
  };

  const deleteRuleWrapper = async (ruleId: string): Promise<void> => {
    await deleteRuleMutation.mutateAsync(ruleId);
  };

  const markRuleViolationWrapper = async (rule: Rule): Promise<void> => {
    await markRuleViolationMutation.mutateAsync(rule);
  };

  return { 
    rules, 
    isLoading, 
    error: error || null, 
    isUsingCachedData,
    saveRule: saveRuleWrapper,
    deleteRule: deleteRuleWrapper,
    markRuleBroken: markRuleViolationWrapper,
    refetchRules: refetch
  };
};
