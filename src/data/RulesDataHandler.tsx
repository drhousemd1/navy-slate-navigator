
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Rule } from '@/data/interfaces/Rule';
import { QueryObserverResult, UseQueryResult } from '@tanstack/react-query';
import { fetchRules } from '@/data/rules/fetchRules';
import { 
  useCreateRule, 
  CreateRuleVariables,
  useUpdateRule, 
  useDeleteRule, 
  useCreateRuleViolation 
} from '@/data/rules/mutations';
import { CreateRuleViolationVariables } from '@/data/rules/types';
import { useUserIds } from '@/contexts/UserIdsContext';
import { useAuth } from '@/contexts/auth';

export type RulesQueryResult = {
  rules: Rule[]; 
  isLoading: boolean;
  error: Error | null;
  saveRule: (ruleData: Partial<Rule>) => Promise<Rule>;
  deleteRule: (ruleId: string) => Promise<void>;
  markRuleBroken: (rule: Rule) => Promise<void>;
  refetchRules: () => Promise<QueryObserverResult<Rule[], Error>>;
};

export const useRulesData = (): RulesQueryResult => {
  const queryClient = useQueryClient();
  const { subUserId, domUserId } = useUserIds();
  const { user } = useAuth();
  
  const { 
    data: rules = [], 
    isLoading,
    error,
    refetch
  }: UseQueryResult<Rule[], Error> = useQuery<Rule[], Error>({
    queryKey: ['rules', subUserId, domUserId],
    queryFn: () => fetchRules(subUserId, domUserId),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60, 
    refetchOnWindowFocus: false, 
    refetchOnReconnect: false,  
    refetchOnMount: false,     
    retry: 1, 
    retryDelay: attempt => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 10000),
    enabled: !!(subUserId || domUserId), // Only run if we have at least one user ID
  });

  const updateRuleMutation = useUpdateRule();
  const createRuleMutation = useCreateRule();
  const deleteRuleMutation = useDeleteRule();
  const markRuleViolationMutation = useCreateRuleViolation();

  const saveRuleWrapper = async (ruleData: Partial<Rule>): Promise<Rule> => {
    if (ruleData.id) {
      return await updateRuleMutation.mutateAsync({
        id: ruleData.id,
        ...ruleData
      });
    } else {
      if (!ruleData.title) {
        throw new Error("Rule title is required for creation.");
      }
      if (!user?.id) {
        throw new Error('User must be authenticated to create rules');
      }

      const createVariables: CreateRuleVariables = {
        title: ruleData.title, 
        user_id: user.id, // Add the required user_id field
        description: ruleData.description,
        priority: ruleData.priority,
        background_image_url: ruleData.background_image_url,
        background_opacity: ruleData.background_opacity,
        icon_url: ruleData.icon_url,
        icon_name: ruleData.icon_name,
        title_color: ruleData.title_color,
        subtext_color: ruleData.subtext_color,
        calendar_color: ruleData.calendar_color,
        icon_color: ruleData.icon_color,
        highlight_effect: ruleData.highlight_effect,
        focal_point_x: ruleData.focal_point_x,
        focal_point_y: ruleData.focal_point_y,
        frequency: ruleData.frequency,
        frequency_count: ruleData.frequency_count,
      };
      return await createRuleMutation.mutateAsync(createVariables);
    }
  };

  const deleteRuleWrapper = async (ruleId: string): Promise<void> => {
    await deleteRuleMutation.mutateAsync(ruleId);
  };

  const markRuleViolationWrapper = async (rule: Rule): Promise<void> => {
    const violationVariables: CreateRuleViolationVariables = {
      rule_id: rule.id 
    };
    await markRuleViolationMutation.mutateAsync(violationVariables);
  };

  return { 
    rules, 
    isLoading, 
    error: error || null, 
    saveRule: saveRuleWrapper,
    deleteRule: deleteRuleWrapper,
    markRuleBroken: markRuleViolationWrapper,
    refetchRules: refetch
  };
};
