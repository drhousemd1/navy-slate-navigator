
// DATA-LAYER ONLY — DO NOT PLACE SUPABASE CALLS IN UI
import { QueryObserverResult, useQueryClient } from '@tanstack/react-query';
import { Rule } from '@/data/interfaces/Rule';
import { useRulesQuery } from '@/data/queries/useRules'; // Import the new query hook
import { useCreateRule, useUpdateRule, useDeleteRule, CreateRuleVariables, UpdateRuleVariables } from '../rules/mutations';
import { useCreateRuleViolation } from '../rules/mutations/useCreateRuleViolation'; // This is likely correct
import { toast } from '@/hooks/use-toast';
import { CRITICAL_QUERY_KEYS } from '@/hooks/useSyncManager'; // Keep if relevant for Rules
import { useAuth } from '@/contexts/auth';

export interface RulesDataHook {
  rules: Rule[];
  isLoading: boolean;
  error: Error | null;
  saveRule: (ruleData: Partial<Rule>) => Promise<Rule>; // Adjusted to match user instruction of RuleDataHandler
  deleteRule: (ruleId: string) => Promise<boolean>; // Adjusted to match user instruction
  markRuleBroken: (rule: Rule) => Promise<void>;
  refetchRules: () => Promise<QueryObserverResult<Rule[], Error>>;
}

export const useRulesData = (): RulesDataHook => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: rules = [],
    isLoading,
    error,
    refetch: refetchRules,
  } = useRulesQuery(); // Use the new query hook

  const { mutateAsync: createRuleMutation } = useCreateRule();
  const { mutateAsync: updateRuleMutation } = useUpdateRule();
  const { mutateAsync: deleteRuleMutation } = useDeleteRule();
  const { mutateAsync: createRuleViolationMutation } = useCreateRuleViolation();

  const saveRule = async (ruleData: Partial<Rule>): Promise<Rule> => {
    try {
      if (!user?.id) throw new Error("User not authenticated for saving rule.");
      
      if (ruleData.id) {
        // Update
        const { id, user_id, created_at, updated_at, usage_data, ...updates } = ruleData; // Exclude fields not directly updatable or managed by backend
        const updateVariables: UpdateRuleVariables = { id, ...updates };
        const updatedRule = await updateRuleMutation(updateVariables);
        toast({ title: "Rule Updated", description: `${updatedRule.title} has been updated.` });
        return updatedRule;
      } else {
        // Create
        // Ensure ruleData conforms to CreateRuleVariables
        const createVariables: CreateRuleVariables = {
          title: ruleData.title || 'Untitled Rule',
          description: ruleData.description,
          priority: ruleData.priority || 'medium',
          frequency: ruleData.frequency || 'daily',
          frequency_count: ruleData.frequency_count || 1,
          // Optional fields from Partial<Rule>
          points_deducted: ruleData.points_deducted,
          dom_points_deducted: ruleData.dom_points_deducted,
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
        };
        const newRule = await createRuleMutation(createVariables);
        toast({ title: "Rule Created", description: `${newRule.title} has been added.` });
        return newRule;
      }
    } catch (err) {
      console.error('Error saving rule in useRulesData:', err);
      toast({ title: 'Error Saving Rule', description: (err as Error).message, variant: 'destructive' });
      throw err;
    }
  };

  const deleteRule = async (ruleId: string): Promise<boolean> => {
    try {
      if (!user?.id) throw new Error("User not authenticated for deleting rule.");
      await deleteRuleMutation(ruleId);
      // Toast is handled by useDeleteOptimisticMutation
      return true;
    } catch (err) {
      console.error('Error deleting rule in useRulesData:', err);
      // Toast handled by hook, but can add specific one here if needed
      // toast({ title: 'Error Deleting Rule', description: (err as Error).message, variant: 'destructive' });
      return false; // As per original return type
    }
  };

  const markRuleBroken = async (rule: Rule): Promise<void> => {
    try {
      if (!user?.id) throw new Error("User not authenticated for marking rule broken.");
      // 1. Create a rule violation record
      await createRuleViolationMutation({ rule_id: rule.id });
      // Toast for success/error of violation creation is handled by useCreateRuleViolation

      // 2. Update the rule's usage_data
      const newUsageDataEntry = Date.now(); 
      const currentUsageData = Array.isArray(rule.usage_data) ? rule.usage_data : [];
      const newUsageData = [...currentUsageData, newUsageDataEntry] as number[] & {toJSON?: () => any};

      await updateRuleMutation({
        id: rule.id,
        usage_data: newUsageData, // Ensure usage_data can be updated this way
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
