import { useQuery, useQueryClient, QueryObserverResult, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCreateRule } from "@/data/rules/mutations/useCreateRule";
import { useUpdateRule } from "@/data/rules/mutations/useUpdateRule";
import { useDeleteRule } from "@/data/rules/mutations/useDeleteRule";
import { Rule } from '@/data/interfaces/Rule';
import { fetchRules } from '@/data/rules/fetchRules';
import { recordViolation } from '@/data/rules/recordViolation';
import { RULES_QUERY_KEY } from './rules/queries';

// Define the RulesQueryResult type
export type RulesQueryResult = UseQueryResult<Rule[], Error> & {
  isUsingCachedData: boolean;
};

export const useRulesData = () => {
  const queryClient = useQueryClient();
  const { mutateAsync: createRule } = useCreateRule();
  const { mutateAsync: updateRule } = useUpdateRule();
  const { mutateAsync: deleteRule } = useDeleteRule();

  const queryResult = useQuery<Rule[], Error>({
    queryKey: RULES_QUERY_KEY,
    queryFn: fetchRules,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    retry: 1,
    retryDelay: attempt => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 10000),
  });

  const isUsingCachedData =
    (!!queryResult.error && queryResult.data && queryResult.data.length > 0) ||
    (queryResult.isStale && queryResult.fetchStatus === 'idle' && queryResult.data && queryResult.data.length > 0 && queryResult.errorUpdateCount > 0);

  // Mark rule broken
  const markRuleBroken = async (rule: Rule): Promise<void> => {
    try {
      await recordViolation(rule.id);
      
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
      // throw error; // decide if this should propagate
    }
  };

  // Save rule wrapper
  const saveRuleOperation = async (ruleData: Partial<Rule>): Promise<Rule> => {
    try {
      if (ruleData.id) {
        const { id, user_id, created_at, updated_at, ...updatableFields } = ruleData;
        const updated = await updateRule({ id, ...updatableFields });
        return updated;
      } else {
        const userData = await supabase.auth.getUser();
        const profile_id = userData.data.user?.id;
        // Ensure ruleData matches CreateRuleInput (from useCreateRule)
        // CreateRuleInput is Partial<Omit<Rule, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'profile_id'>> & { title: string; ... other required }
        const { id, user_id, created_at, updated_at, ...creatableRuleData } = ruleData;

        const variables = {
            ...creatableRuleData,
            title: creatableRuleData.title || "Default Rule Title", // Ensure title
            // Ensure all other required fields for CreateRuleInput are present
            // For example, if priority is required:
            priority: creatableRuleData.priority || 'medium',
            frequency: creatableRuleData.frequency || 'daily',
            frequency_count: creatableRuleData.frequency_count || 1,
            // Default other non-optional fields from Rule if not in creatableRuleData
            icon_color: creatableRuleData.icon_color || '#FFFFFF',
            title_color: creatableRuleData.title_color || '#FFFFFF',
            subtext_color: creatableRuleData.subtext_color || '#FFFFFF',
            calendar_color: creatableRuleData.calendar_color || '#9c7abb',
            background_opacity: creatableRuleData.background_opacity || 100,
            highlight_effect: creatableRuleData.highlight_effect || false,
            focal_point_x: creatableRuleData.focal_point_x || 50,
            focal_point_y: creatableRuleData.focal_point_y || 50,
            profile_id: profile_id // Pass profile_id if it's part of CreateRuleInput
        };

        // Filter out undefined profile_id if not allowed by type
        if (variables.profile_id === undefined) {
            delete (variables as any).profile_id;
        }
        
        const newRule = await createRule(variables as any); // Cast if variables don't perfectly match
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
  const deleteRuleOperation = async (ruleId: string): Promise<void> => { // Changed to void
    try {
      await deleteRule(ruleId);
      // Toast is handled by the hook
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({ // Keep this for page-specific feedback if hook's toast isn't enough
        title: 'Error Deleting Rule',
        description: (error as Error).message || 'Failed to delete rule. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Refetch rules
  const refetchRules = async (): Promise<QueryObserverResult<Rule[], Error>> => {
    return queryResult.refetch();
  };

  return {
    rules: queryResult.data || [],
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    isUsingCachedData,
    saveRule: saveRuleOperation,
    deleteRule: deleteRuleOperation,
    markRuleBroken,
    refetchRules
  };
};
