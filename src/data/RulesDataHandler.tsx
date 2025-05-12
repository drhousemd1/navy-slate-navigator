
import { useQuery, useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCreateRule } from "@/data/mutations/useCreateRule";
import { useUpdateRule } from "@/data/mutations/useUpdateRule";
import { useDeleteRule } from "@/data/mutations/useDeleteRule";
import { Rule } from '@/data/interfaces/Rule';
import { fetchRules } from '@/data/rules/fetchRules';
import { recordViolation } from '@/data/rules/recordViolation';

export const useRulesData = () => {
  const queryClient = useQueryClient();
  const { mutateAsync: createRule } = useCreateRule();
  const { mutateAsync: updateRule } = useUpdateRule();
  const { mutateAsync: deleteRule } = useDeleteRule();

  // Query for fetching rules
  const {
    data: rules = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['rules'],
    queryFn: fetchRules,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  // Create rule wrapper
  async function createRuleInDb(newRule: any, profileId?: string): Promise<boolean> {
    await createRule({ ...newRule, profile_id: profileId });
    return true;
  }

  // Update rule wrapper
  async function updateRuleInDb(ruleId: string, updates: any): Promise<boolean> {
    await updateRule({ ruleId, updates });
    return true;
  }

  // Delete rule wrapper
  async function deleteRuleInDb(ruleId: string): Promise<boolean> {
    await deleteRule(ruleId);
    return true;
  }

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
    }
  };

  // Save rule wrapper
  const saveRule = async (ruleData: Partial<Rule>): Promise<Rule> => {
    try {
      if (ruleData.id) {
        // Update existing rule
        await updateRuleInDb(ruleData.id, ruleData);
        
        // Get the updated rule from the cache or refetch it
        const updatedRule = queryClient.getQueryData<Rule[]>(['rules'])?.find(r => r.id === ruleData.id);
        
        if (!updatedRule) {
          throw new Error('Failed to get updated rule');
        }
        
        return updatedRule;
      } else {
        // Create new rule
        const userData = await supabase.auth.getUser();
        await createRuleInDb(ruleData, userData.data.user?.id);
        
        // Force refetch to get the new rule with server-generated ID
        await refetch();
        
        // Get the newly created rule from cache (this is a best-effort approach)
        const allRules = queryClient.getQueryData<Rule[]>(['rules']) || [];
        const newRule = allRules.find(r => r.title === ruleData.title);
        
        if (!newRule) {
          throw new Error('Failed to get newly created rule');
        }
        
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

  // Refetch rules
  const refetchRules = async (): Promise<QueryObserverResult<Rule[], Error>> => {
    return refetch();
  };

  return {
    rules,
    isLoading,
    error,
    saveRule,
    deleteRule: async (ruleId: string) => {
      try {
        await deleteRuleInDb(ruleId);
        return true;
      } catch (error) {
        console.error('Error deleting rule:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete rule. Please try again.',
          variant: 'destructive',
        });
        throw error;
      }
    },
    markRuleBroken,
    refetchRules
  };
};
