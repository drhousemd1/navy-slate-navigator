
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Rule } from '@/data/interfaces/Rule';
import { UseQueryResult, QueryObserverResult } from '@tanstack/react-query';
import { fetchRules } from '@/data/rules/fetchRules';
import { 
  useCreateRule, 
  CreateRuleVariables, // Import CreateRuleVariables
  useUpdateRule, 
  useDeleteRule, 
  useCreateRuleViolation 
} from '@/data/rules/mutations';
import { CreateRuleViolationVariables } from '@/data/rules/types'; // Import CreateRuleViolationVariables

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
  const updateRuleMutation = useUpdateRule(); // Renamed for clarity
  const createRuleMutation = useCreateRule(); // Renamed for clarity
  const deleteRuleMutation = useDeleteRule();
  const markRuleViolationMutation = useCreateRuleViolation();

  const saveRuleWrapper = async (ruleData: Partial<Rule>): Promise<Rule> => {
    if (ruleData.id) {
      // This is an update operation
      // useUpdateRule expects { id: string, ...updates }
      // Ensure ruleData has an id, which it does in this block
      return await updateRuleMutation.mutateAsync({
        id: ruleData.id,
        ...ruleData
      });
    } else {
      // This is a create operation
      // useCreateRule expects CreateRuleVariables, which requires title
      if (!ruleData.title) {
        throw new Error("Rule title is required for creation.");
      }
      // Ensure the object passed matches CreateRuleVariables
      // All other properties in CreateRuleVariables are optional or have defaults in the mutation
      const createVariables: CreateRuleVariables = {
        title: ruleData.title, // title is now guaranteed
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
        // 'id', 'created_at', 'updated_at', 'usage_data' are handled by the backend or mutation defaults
      };
      return await createRuleMutation.mutateAsync(createVariables);
    }
  };

  const deleteRuleWrapper = async (ruleId: string): Promise<void> => {
    await deleteRuleMutation.mutateAsync(ruleId);
  };

  const markRuleViolationWrapper = async (rule: Rule): Promise<void> => {
    // useCreateRuleViolation expects { rule_id: string }
    const violationVariables: CreateRuleViolationVariables = {
      rule_id: rule.id 
    };
    await markRuleViolationMutation.mutateAsync(violationVariables);
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

