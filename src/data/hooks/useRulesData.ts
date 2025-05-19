import { QueryObserverResult } from '@tanstack/react-query';
import { useRules } from '../rules/queries'; 
import { Rule } from '@/data/interfaces/Rule';
import { useCreateRule, useUpdateRule, useDeleteRule, CreateRuleVariables, UpdateRuleVariables } from '../rules/mutations';
import { useCreateRuleViolation } from '../rules/mutations/useCreateRuleViolation';
import { toast } from '@/hooks/use-toast';


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
  const {
    data: rules = [],
    isLoading,
    error,
    refetch: refetchRules,
  } = useRules(); 

  const { mutateAsync: createRuleMutation } = useCreateRule();
  const { mutateAsync: updateRuleMutation } = useUpdateRule();
  const { mutateAsync: deleteRuleMutation } = useDeleteRule();
  const { mutateAsync: createRuleViolationMutation } = useCreateRuleViolation();

  const saveRule = async (ruleData: Partial<Rule>): Promise<Rule> => {
    if (ruleData.id) {
      const { id, ...updates } = ruleData;
      return updateRuleMutation({ id, ...updates } as UpdateRuleVariables);
    } else {
      const createVariables: CreateRuleVariables = {
        title: ruleData.title || 'Untitled Rule',
        description: ruleData.description,
        priority: ruleData.priority || 'medium',
        frequency: ruleData.frequency || 'daily',
        frequency_count: ruleData.frequency_count || 1,
        icon_name: ruleData.icon_name,
        icon_url: ruleData.icon_url,
        icon_color: ruleData.icon_color || '#FFFFFF',
        title_color: ruleData.title_color || '#FFFFFF', 
        subtext_color: ruleData.subtext_color || '#FFFFFF',
        calendar_color: ruleData.calendar_color || '#9c7abb',
        background_image_url: ruleData.background_image_url,
        background_opacity: ruleData.background_opacity === undefined ? 100 : ruleData.background_opacity,
        highlight_effect: ruleData.highlight_effect === undefined ? false : ruleData.highlight_effect,
        focal_point_x: ruleData.focal_point_x === undefined ? 50 : ruleData.focal_point_x,
        focal_point_y: ruleData.focal_point_y === undefined ? 50 : ruleData.focal_point_y,
      };
      return createRuleMutation(createVariables);
    }
  };

  const deleteRule = async (ruleId: string): Promise<boolean> => {
    try {
      await deleteRuleMutation(ruleId);
      return true;
    } catch (e) {
      console.error('Error deleting rule (from useRulesData):', e);
      return false;
    }
  };

  const markRuleBroken = async (rule: Rule): Promise<void> => {
    try {
      await createRuleViolationMutation({ rule_id: rule.id });

      const newUsageDataEntry = Date.now(); 
      const currentUsageData = Array.isArray(rule.usage_data) ? rule.usage_data : [];
      const newUsageData = [...currentUsageData, newUsageDataEntry] as number[] & {toJSON?: () => any};

      await updateRuleMutation({
        id: rule.id,
        usage_data: newUsageData,
      });

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
