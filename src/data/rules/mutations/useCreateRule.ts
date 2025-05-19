
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule } from '@/data/interfaces/Rule';
import { useCreateOptimisticMutation } from '@/lib/optimistic-mutations';
import { loadRulesFromDB, saveRulesToDB, setLastSyncTimeForRules } from '@/data/indexedDB/useIndexedDB';
import { RULES_QUERY_KEY } from '../queries';
import { toast } from '@/hooks/use-toast';

export type CreateRuleVariables = Partial<Omit<Rule, 'id' | 'created_at' | 'updated_at' | 'usage_data'>> & {
  title: string;
  // Add other non-optional fields from Rule if not already covered
};

export const useCreateRule = () => {
  const queryClient = useQueryClient();

  return useCreateOptimisticMutation<Rule, Error, CreateRuleVariables>({
    queryClient,
    queryKey: [...RULES_QUERY_KEY], // Ensure mutable array
    mutationFn: async (variables: CreateRuleVariables) => {
      const { data, error } = await supabase
        .from('rules')
        .insert({ ...variables })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error('Rule creation failed, no data returned.');
      return data as Rule;
    },
    entityName: 'Rule',
    createOptimisticItem: (variables, optimisticId) => {
      const now = new Date().toISOString();
      return {
        id: optimisticId,
        created_at: now,
        updated_at: now,
        usage_data: [], // Default for new rules
        // Default values based on schema
        title_color: '#FFFFFF',
        background_opacity: 100,
        highlight_effect: false,
        focal_point_x: 50,
        focal_point_y: 50,
        frequency_count: 3,
        subtext_color: '#FFFFFF',
        calendar_color: '#9c7abb',
        icon_color: '#FFFFFF',
        frequency: 'daily',
        priority: 'medium',
        ...variables,
      } as Rule;
    },
    onSuccessCallback: async (newRuleData) => {
      console.log('[useCreateRule onSuccessCallback] New rule created on server, updating IndexedDB.', newRuleData);
      try {
        const localRules = await loadRulesFromDB() || [];
        // Ensure no duplicate optimistic item if server returns faster than optimistic removal
        const updatedLocalRules = [newRuleData, ...localRules.filter(r => r.id !== newRuleData.id && r.id !== (newRuleData as any).optimisticId)];
        await saveRulesToDB(updatedLocalRules);
        await setLastSyncTimeForRules(new Date().toISOString());
        console.log('[useCreateRule onSuccessCallback] IndexedDB updated with new rule.');
        // Generic success toast is handled by useCreateOptimisticMutation, specific one can be here if needed
        // toast({ title: "Rule Created", description: `Rule "${newRuleData.title}" has been successfully created and saved locally.` });
      } catch (error) {
        console.error('[useCreateRule onSuccessCallback] Error updating IndexedDB:', error);
        toast({ variant: "destructive", title: "Local Save Error", description: "Rule created on server, but failed to save locally." });
      }
    },
    mutationOptions: { // onError moved into mutationOptions
      onError: (error, variables) => {
        console.error('[useCreateRule onError] Error creating rule:', error, variables);
        // Generic error toast is handled by useCreateOptimisticMutation
        // toast({ variant: "destructive", title: "Rule Creation Failed", description: error.message || "Could not create the rule." });
      },
    }
  });
};
