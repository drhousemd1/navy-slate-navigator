
// DATA-LAYER ONLY — DO NOT PLACE SUPABASE CALLS IN UI
import { useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCreateRule } from "@/data/rules/mutations/useCreateRule";
import { useUpdateRule } from "@/data/rules/mutations/useUpdateRule";
import { useDeleteRule } from "@/data/rules/mutations/useDeleteRule";
import { Rule } from '@/data/interfaces/Rule';
// import { fetchRules } from '@/data/rules/fetchRules'; // To be removed
import { recordViolation } from '@/data/rules/recordViolation';
import { useRules as useRulesQuery } from '@/data/queries/useRules'; // Import the new query hook

export const useRulesData = () => {
  const queryClient = useQueryClient();
  const { mutateAsync: createRuleMutation } = useCreateRule();
  const { mutateAsync: updateRuleMutation } = useUpdateRule();
  const { mutateAsync: deleteRuleMutation } = useDeleteRule();

  // Use the new query hook for fetching rules
  const {
    data: rules = [],
    isLoading,
    error,
    refetch
  } = useRulesQuery();

  // Mark rule broken
  const markRuleBroken = async (rule: Rule): Promise<void> => {
    try {
      await recordViolation(rule.id); // Assuming rule.id is string (UUID)
      
      toast({
        title: `Rule Violated: ${rule.title}`,
        description: "This violation has been recorded and consequences have been applied.",
        variant: "destructive",
      });
      // Potentially refetch punishments or trigger navigation here if needed
    } catch (error) {
      console.error('Error recording rule violation:', error);
      toast({
        title: 'Error',
        description: 'Failed to record rule violation. Please try again.',
        variant: 'destructive',
      });
      // throw error; // Decide if this should propagate based on UX needs
    }
  };

  // Save rule wrapper (handles create and update)
  const saveRule = async (ruleData: Partial<Rule>): Promise<Rule> => {
    try {
      let savedRule: Rule;
      if (ruleData.id) {
        // Update existing rule
        // Ensure we only pass fields that can be updated and are defined in UpdateRuleVariables
        const { id, user_id, created_at, updated_at, usage_data, ...updatableFields } = ruleData;
        // usage_data might not be directly updatable via this generic save, depends on mutation setup.
        // For now, assume it's handled if it's part of updatableFields.
        savedRule = await updateRuleMutation({ id, ...updatableFields });
      } else {
        // Create new rule
        // Ensure ruleData matches CreateRuleVariables
        // Remove fields that are auto-generated or not part of creation
        const { id, user_id, created_at, updated_at, usage_data, ...creatableRuleData } = ruleData;
        
        // Provide defaults for required fields if not present in ruleData, matching CreateRuleVariables
        const variables = {
            ...creatableRuleData,
            title: creatableRuleData.title || "Default Rule Title",
            priority: creatableRuleData.priority || 'medium',
            frequency: creatableRuleData.frequency || 'daily',
            frequency_count: creatableRuleData.frequency_count || 1,
            icon_color: creatableRuleData.icon_color || '#FFFFFF',
            title_color: creatableRuleData.title_color || '#FFFFFF',
            subtext_color: creatableRuleData.subtext_color || '#FFFFFF',
            calendar_color: creatableRuleData.calendar_color || '#9c7abb',
            background_opacity: creatableRuleData.background_opacity ?? 100, // Use ?? for default if 0 is valid
            highlight_effect: creatableRuleData.highlight_effect ?? false,
            focal_point_x: creatableRuleData.focal_point_x ?? 50,
            focal_point_y: creatableRuleData.focal_point_y ?? 50,
            // profile_id: profile_id, // If profile_id is needed and part of CreateRuleVariables
        };
        savedRule = await createRuleMutation(variables);
      }
      // Optimistic updates are handled by the mutation hooks.
      // Toasts are also handled by optimistic mutation hooks.
      return savedRule;
    } catch (error) {
      console.error('Error saving rule:', error);
      toast({
        title: 'Error Saving Rule',
        description: (error as Error).message || 'Failed to save rule. Please try again.',
        variant: 'destructive',
      });
      throw error; // Re-throw to be caught by UI layer if needed
    }
  };

  // Delete rule operation
  const deleteRule = async (ruleId: string): Promise<void> => {
    try {
      await deleteRuleMutation(ruleId);
      // Toast is handled by the useDeleteOptimisticMutation hook.
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: 'Error Deleting Rule',
        description: (error as Error).message || 'Failed to delete rule. Please try again.',
        variant: 'destructive',
      });
      throw error; // Re-throw
    }
  };

  // Refetch rules
  const refetchRules = async (): Promise<QueryObserverResult<Rule[], Error>> => {
    return refetch(); // refetch from useRulesQuery
  };

  return {
    rules,
    isLoading,
    error,
    saveRule,
    deleteRule,
    markRuleBroken,
    refetchRules
  };
};
