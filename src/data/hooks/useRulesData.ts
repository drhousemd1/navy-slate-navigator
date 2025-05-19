import { useQuery, useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { fetchRules } from '../rules/fetchRules';
import { useCreateRule, useUpdateRule, useDeleteRule } from '../rules/mutations';
import { CreateRuleVariables, UpdateRuleVariables } from '../rules/mutations';
import { useCreateRuleViolation } from '../rules/mutations/useCreateRuleViolation';
import { toast } from '@/hooks/use-toast';
import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager';


export interface RulesDataHook {
  rules: Rule[];
  isLoading: boolean;
  error: Error | null;
  saveRule: (ruleData: Partial<Rule>) => Promise<Rule>;
  deleteRule: (ruleId: string) => Promise<boolean>;
  markRuleBroken: (rule: Rule) => Promise<void>;
  refetchRules: () => Promise<QueryObserverResult<Rule[], Error>>;
}

export const useRulesData = (): RulesDataHook => {
  const queryClient = useQueryClient();
  const {
    data: rules = [],
    isLoading,
    error,
    refetch: refetchRules,
  } = useQuery<Rule[], Error>({
    queryKey: CRITICAL_QUERY_KEYS.RULES,
    queryFn: fetchRules,
  });

  const { mutateAsync: createRuleMutation } = useCreateRule();
  const { mutateAsync: updateRuleMutation } = useUpdateRule();
  const { mutateAsync: deleteRuleMutation } = useDeleteRule();
  const { mutateAsync: createRuleViolationMutation } = useCreateRuleViolation();

  const saveRule = async (ruleData: Partial<Rule>): Promise<Rule> => {
    if (ruleData.id) {
      // It's an update
      const { id, ...updates } = ruleData;
      return updateRuleMutation({ id, ...updates } as UpdateRuleVariables);
    } else {
      // It's a creation
      const createVariables: CreateRuleVariables = {
        title: ruleData.title || 'Untitled Rule',
        description: ruleData.description,
        priority: ruleData.priority || 'medium',
        frequency: ruleData.frequency || 'daily',
        frequency_count: ruleData.frequency_count || 1,
        icon_name: ruleData.icon_name,
        icon_url: ruleData.icon_url,
        icon_color: ruleData.icon_color,
        title_color: ruleData.title_color,
        subtext_color: ruleData.subtext_color,
        calendar_color: ruleData.calendar_color,
        background_image_url: ruleData.background_image_url,
        background_opacity: ruleData.background_opacity,
        highlight_effect: ruleData.highlight_effect,
        focal_point_x: ruleData.focal_point_x,
        focal_point_y: ruleData.focal_point_y,
        // user_id might be part of ruleData if applicable
      };
      return createRuleMutation(createVariables);
    }
  };

  const deleteRule = async (ruleId: string): Promise<boolean> => {
    try {
      await deleteRuleMutation(ruleId);
      // No explicit toast here as useDeleteOptimisticMutation handles it
      return true;
    } catch (e) {
      // Error toast handled by useDeleteOptimisticMutation
      console.error('Error deleting rule (from useRulesData):', e);
      return false;
    }
  };

  const markRuleBroken = async (rule: Rule): Promise<void> => {
    try {
      // 1. Create a rule violation record
      await createRuleViolationMutation({ rule_id: rule.id });
      // Toast for success/error of violation creation is handled by useCreateRuleViolation

      // 2. Update the rule's usage_data
      const newUsageDataEntry = Date.now(); // Using timestamp as number
      const currentUsageData = Array.isArray(rule.usage_data) ? rule.usage_data : [];
      // Ensure usage_data is treated as number[] as per previous analysis
      const newUsageData = [...currentUsageData, newUsageDataEntry] as number[] & {toJSON?: () => any};


      await updateRuleMutation({
        id: rule.id,
        usage_data: newUsageData,
      });
      // Toast for success/error of rule update is handled by useUpdateRule

      toast({
        title: "Rule Marked Broken",
        description: `${rule.title} marked as broken. Violation recorded and usage updated.`,
      });

    } catch (e: any) {
      console.error('Error marking rule broken:', e);
      toast({
        title: 'Error',
        description: `Failed to mark rule "${rule.title}" as broken: ${e.message}`,
        variant: 'destructive',
      });
      // Re-throw if the caller needs to act on the error
      throw e;
    }
  };

  return {
    rules,
    isLoading,
    error,
    saveRule,
    deleteRule,
    markRuleBroken,
    refetchRules,
  };
};
