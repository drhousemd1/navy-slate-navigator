
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Rule } from "@/data/interfaces/Rule";
import { toast } from '@/hooks/use-toast';
import { saveRulesToDB } from "../indexedDB/useIndexedDB";

// Define the input type for updating a rule
type UpdateRuleInput = Partial<Omit<Rule, 'id' | 'user_id' | 'created_at'>> & { id: string };


export function useUpdateRule() {
  const queryClient = useQueryClient();

  return useMutation<Rule, Error, UpdateRuleInput, { previousRules?: Rule[] }>({
    onMutate: async (ruleUpdates) => {
      await queryClient.cancelQueries({ queryKey: ['rules'] });

      const previousRules = queryClient.getQueryData<Rule[]>(['rules']);

      queryClient.setQueryData<Rule[]>(['rules'], (oldRules = []) =>
        oldRules.map(rule =>
          rule.id === ruleUpdates.id
            ? { ...rule, ...ruleUpdates, updated_at: new Date().toISOString() }
            : rule
        )
      );

      return { previousRules };
    },
    mutationFn: async (ruleUpdates) => {
      const { id, ...updates } = ruleUpdates;
      const ruleDataToUpdate = {
        ...updates,
        updated_at: new Date().toISOString(), // Ensure updated_at is set
      };

      const { data, error } = await supabase
        .from("rules")
        .update(ruleDataToUpdate)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        toast({
          title: 'Error Updating Rule',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }
      return data as Rule;
    },
    onSuccess: async (serverRule) => {
      // Ensure cache reflects the server state, though optimistic update might be close
      queryClient.setQueryData<Rule[]>(['rules'], (oldRules = []) =>
        oldRules.map(rule => (rule.id === serverRule.id ? serverRule : rule))
      );
      
      const currentRules = queryClient.getQueryData<Rule[]>(['rules']) || [];
      try {
        await saveRulesToDB(currentRules);
      } catch (indexedDbError) {
        console.error('Failed to save rules to IndexedDB after update:', indexedDbError);
        toast({
          title: 'Local Cache Error',
          description: 'Rule updated on server, but failed to update local cache.',
          variant: 'default',
        });
      }

      toast({
        title: 'Rule Updated',
        description: `Rule "${serverRule.title}" has been successfully updated.`,
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData<Rule[]>(['rules'], context.previousRules);
      }
      if (!(error as Error).message.includes('Error Updating Rule')) {
        toast({
          title: 'Update Failed',
          description: 'Could not update the rule. Please try again.',
          variant: 'destructive',
        });
      }
      console.error('Error updating rule (from onError):', (error as Error).message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
    },
  });
}
