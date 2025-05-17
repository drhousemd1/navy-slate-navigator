
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "../queryClient"; // queryClient is already imported, ensure it's used or remove if not directly.
import { saveRulesToDB } from "../indexedDB/useIndexedDB";
import { Rule } from "@/data/interfaces/Rule"; // Import the Rule type
import { toast } from '@/hooks/use-toast'; // Import toast

export function useDeleteRule() {
  const localQueryClient = useQueryClient(); // Renamed to avoid conflict if queryClient was meant to be the global one

  return useMutation<string, Error, string, { previousRules: Rule[] | undefined }>({
    onMutate: async (deletedRuleId: string) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await localQueryClient.cancelQueries({ queryKey: ['rules'] });

      // Snapshot the previous value
      const previousRules = localQueryClient.getQueryData<Rule[]>(['rules']);

      // Optimistically update to the new value
      if (previousRules) {
        const updatedRules = previousRules.filter(rule => rule.id !== deletedRuleId);
        localQueryClient.setQueryData<Rule[]>(['rules'], updatedRules);
      }

      // Return a context object with the snapshotted value
      return { previousRules };
    },
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase.from("rules").delete().eq("id", ruleId);
      if (error) {
        toast({
          title: 'Error Deleting Rule',
          description: error.message,
          variant: 'destructive',
        });
        throw error; // Propagate error to trigger onError
      }
      return ruleId; // Return the deleted rule ID on success
    },
    onSuccess: async (deletedRuleId) => {
      // The optimistic update is already applied.
      // Now, update IndexedDB since the server operation was successful.
      const currentRules = localQueryClient.getQueryData<Rule[]>(['rules']) || [];
      try {
        await saveRulesToDB(currentRules);
      } catch (indexedDbError) {
        console.error('Failed to save rules to IndexedDB after deletion:', indexedDbError);
        toast({
          title: 'Local Cache Error',
          description: 'Rule deleted from server, but failed to update local cache.',
          variant: 'default',
        });
      }

      toast({
        title: 'Rule Deleted',
        description: 'The rule has been successfully deleted.',
      });
    },
    onError: (error, deletedRuleId, context) => {
      // Rollback to the previous value if mutation fails
      if (context?.previousRules) {
        localQueryClient.setQueryData<Rule[]>(['rules'], context.previousRules);
      }
      // Avoid showing a generic "Deletion Failed" if a specific one was already shown in mutationFn.
      if (!(error as Error).message.includes('Error Deleting Rule')) {
        toast({
          title: 'Deletion Failed',
          description: 'Could not delete the rule. Please try again.',
          variant: 'destructive',
        });
      }
      console.error('Error deleting rule (from onError):', (error as Error).message);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state consistency
      // This also helps if IndexedDB save failed, refetch would try to get latest from server and save again.
      localQueryClient.invalidateQueries({ queryKey: ['rules'] });
    },
  });
}
