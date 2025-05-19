
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Rule } from '@/data/interfaces/Rule';
import { UseQueryResult, QueryObserverResult } from '@tanstack/react-query';
import { fetchRules } from '@/data/rules/fetchRules';
import { 
  useCreateRule, 
  useUpdateRule, 
  useDeleteRule, 
  useCreateRuleViolation 
} from '@/data/rules/mutations';

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

  // Use the mutation hooks from the modern structure
  const createUpdateRuleMutation = useUpdateRule();
  const saveRuleMutation = useCreateRule();
  const deleteRuleMutation = useDeleteRule();
  const markRuleViolationMutation = useCreateRuleViolation();

  const saveRuleWrapper = async (ruleData: Partial<Rule>): Promise<Rule> => {
    if (ruleData.id) {
      return await createUpdateRuleMutation.mutateAsync({
        id: ruleData.id,
        ...ruleData
      });
    } else {
      return await saveRuleMutation.mutateAsync(ruleData);
    }
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
