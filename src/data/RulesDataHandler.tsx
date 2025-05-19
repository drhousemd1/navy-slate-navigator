import { useQuery, useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCreateRule } from "@/data/rules/mutations/useCreateRule";
import { useUpdateRule } from "@/data/rules/mutations/useUpdateRule";
import { useDeleteRule } from "@/data/rules/mutations/useDeleteRule";
import { Rule } from '@/data/interfaces/Rule';
import { fetchRules } from '@/data/rules/fetchRules';
import { recordViolation } from '@/data/rules/recordViolation';

// Export wrapper functions
/*
export async function createRuleInDb(newRule: any, profileId?: string): Promise<boolean> {
  // This needs to be a component or custom hook to use useCreateRule
  // const { mutateAsync } = useCreateRule(); 
  // ...
  return true;
}

export async function updateRuleInDb(ruleId: string, updates: Partial<Rule>): Promise<boolean> {
  // This needs to be a component or custom hook to use useUpdateRule
  // const { mutateAsync } = useUpdateRule();
  // ...
  return true;
}

export async function deleteRuleInDb(ruleId: string): Promise<boolean> {
  // This needs to be a component or custom hook to use useDeleteRule
  // const { mutateAsync } = useDeleteRule();
  // ...
  return true;
}
*/

export const useRulesData = () => {
  const queryClient = useQueryClient();
  const { mutateAsync: createRule } = useCreateRule();
  const { mutateAsync: updateRule } = useUpdateRule();
  const { mutateAsync: deleteRuleMutate } = useDeleteRule(); // Renamed to avoid conflict

  // Query for fetching rules
  const {
    data: rules = [],
    isLoading,
    error,
    refetch
  } = useQuery<Rule[], Error>({
    queryKey: ['rules'],
    queryFn: fetchRules,
    // staleTime, gcTime etc are now managed by useRules query hook or global config
  });

  // Mark rule broken
  const markRuleBroken = async (rule: Rule): Promise<void> => {
    try {
      await recordViolation(rule.id);
      // This mutation might also update the rule or related data.
      // If so, it should also use setQueryData or the affected queries should be handled.
      // For now, focusing on CRUD for rules themselves.
      // queryClient.invalidateQueries({ queryKey: ['rule_violations'] }); // Example if there was such a query
      toast({
        title: `Rule Violated: ${rule.title}`,
        description: "This violation has been recorded and consequences have been applied.",
        variant: "destructive",
      });
      
    } catch (error) {
      console.error('Error recording rule violation:', error);
      toast({
        title: 'Error',
        description: 'Failed to record rule violation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Save rule wrapper
  const saveRuleOperation = async (ruleData: Partial<Rule>): Promise<Rule> => {
    try {
      if (ruleData.id) {
        const { id, user_id, created_at, updated_at, ...updatableFields } = ruleData;
        // Ensure 'id' is part of updatableFields if the mutation expects it at top level
        const updated = await updateRule({ id, ...updatableFields });
        queryClient.setQueryData<Rule[]>(['rules'], (oldData = []) =>
          oldData.map(r => r.id === updated.id ? updated : r)
        );
        return updated;
      } else {
        // ... keep existing code (logic for creating 'variables' for new rule)
        const userData = await supabase.auth.getUser();
        const profile_id = userData.data.user?.id;
        const { id, user_id, created_at, updated_at, ...creatableRuleData } = ruleData;

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
            background_opacity: creatableRuleData.background_opacity || 100,
            highlight_effect: creatableRuleData.highlight_effect || false,
            focal_point_x: creatableRuleData.focal_point_x || 50,
            focal_point_y: creatableRuleData.focal_point_y || 50,
            profile_id: profile_id 
        };
        if (variables.profile_id === undefined) {
            delete (variables as any).profile_id;
        }
        
        const newRule = await createRule(variables as any); 
        queryClient.setQueryData<Rule[]>(['rules'], (oldData = []) =>
          [newRule, ...oldData]
        );
        return newRule;
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to save rule. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Delete rule operation
  const deleteRuleOperation = async (ruleId: string): Promise<void> => { 
    try {
      await deleteRuleMutate(ruleId); // Use the renamed mutation
      queryClient.setQueryData<Rule[]>(['rules'], (oldData = []) =>
        oldData.filter(r => r.id !== ruleId)
      );
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({ 
        title: 'Error Deleting Rule',
        description: (error as Error).message || 'Failed to delete rule. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Refetch rules
  const refetchRules = async (): Promise<QueryObserverResult<Rule[], Error>> => {
    return refetch(); // Kept for now, if other parts of app rely on it.
  };

  return {
    rules,
    isLoading,
    error,
    saveRule: saveRuleOperation,
    deleteRule: deleteRuleOperation, // Make sure this is boolean if context expects boolean
    markRuleBroken,
    refetchRules
  };
};
