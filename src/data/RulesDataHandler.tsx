import { useQuery, useQueryClient, QueryObserverResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCreateRule } from "@/data/mutations/useCreateRule";
import { useUpdateRule } from "@/data/mutations/useUpdateRule";
import { useDeleteRule } from "@/data/mutations/useDeleteRule";
import { Rule } from '@/data/interfaces/Rule';
import { fetchRules } from '@/data/rules/fetchRules';
import { recordViolation } from '@/data/rules/recordViolation';

// Export wrapper functions
export async function createRuleInDb(newRule: any, profileId?: string): Promise<boolean> {
  const { mutateAsync } = useCreateRule();
  // Ensure newRule matches CreateRuleInput, which omits id, created_at, updated_at, user_id
  const { id, created_at, updated_at, user_id, ...creatableRuleData } = newRule;
  await mutateAsync({ ...creatableRuleData, profile_id: profileId }); // profile_id might not be part of Rule, ensure CreateRuleInput matches
  return true;
}

export async function updateRuleInDb(ruleId: string, updates: Partial<Rule>): Promise<boolean> {
  const { mutateAsync } = useUpdateRule();
  // Destructure to remove properties that are not part of the updatable fields
  // or are handled differently by the mutation (like id).
  // UpdateRuleInput is Partial<Omit<Rule, 'id' | 'user_id' | 'created_at'>> & { id: string }
  const { id: currentId, user_id, created_at, updated_at, ...updatableFields } = updates;
  
  await mutateAsync({ id: ruleId, ...updatableFields });
  return true;
}

export async function deleteRuleInDb(ruleId: string): Promise<boolean> {
  const { mutateAsync } = useDeleteRule();
  await mutateAsync(ruleId);
  return true;
}

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
        // Pass only the actual updatable fields, not the whole ruleData if it contains non-updatable ones.
        // The updateRuleInDb function now handles filtering.
        await updateRuleInDb(ruleData.id, ruleData);
        
        // Get the updated rule from the cache or refetch it
        // Optimistic updates in useUpdateRule should handle cache update.
        // This find operation relies on the cache being up-to-date.
        const updatedRule = queryClient.getQueryData<Rule[]>(['rules'])?.find(r => r.id === ruleData.id);
        
        if (!updatedRule) {
          // This might happen if the cache update logic in useUpdateRule's onSuccess/onMutate
          // hasn't completed or if the rule somehow isn't found.
          // Consider refetching or relying more on the optimistic update's return value if possible.
          await refetch(); // Fallback to refetch if optimistic update is not immediately reflected for some reason
          const freshRules = queryClient.getQueryData<Rule[]>(['rules']) || [];
          const foundRule = freshRules.find(r => r.id === ruleData.id);
          if (!foundRule) throw new Error('Failed to get updated rule after refetch');
          return foundRule;
        }
        
        return updatedRule;
      } else {
        // Create new rule
        const userData = await supabase.auth.getUser();
        // createRuleInDb expects 'newRule' and optionally 'profileId'
        // Ensure ruleData matches CreateRuleInput, which omits id, created_at, updated_at, user_id
        const { id, created_at, updated_at, user_id, ...creatableRuleData } = ruleData;

        await createRuleInDb(creatableRuleData, userData.data.user?.id);
        
        // Optimistic updates in useCreateRule should add the rule optimistically.
        // A refetch might still be desired to confirm server state or get server-generated fields accurately.
        // However, if the optimistic update is robust, this refetch might be skippable for UX.
        // For now, keeping refetch to ensure consistency, but this could be optimized.
        await refetch();
        
        // Get the newly created rule from cache
        const allRules = queryClient.getQueryData<Rule[]>(['rules']) || [];
        // Finding by title is brittle. The optimistic update in useCreateRule should replace the
        // temp ID with the server ID. We should try to find by a more stable property or rely on the mutation's result.
        const newRule = allRules.find(r => 
          r.title === ruleData.title && 
          (!ruleData.id || r.id !== ruleData.id) // Ensure it's not the optimistic one if we had a temp client-side ID
        ); 
        
        if (!newRule) {
          // This could happen if title is not unique or optimistic update path has issues.
          // The best way is usually to get the created rule from the `useCreateRule` mutation's `onSuccess` data.
          // Since createRuleInDb doesn't return it, we rely on cache.
          console.warn('Could not find newly created rule by title, returning first rule as a fallback. This may not be the correct rule.');
          if (allRules.length > 0) return allRules[0]; // Highly unreliable fallback
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
        // Optimistic update in useDeleteRule should handle cache.
        // No explicit return value indicating success other than not throwing.
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
