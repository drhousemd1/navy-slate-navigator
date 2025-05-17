
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Rule } from "@/data/interfaces/Rule";
import { toast } from '@/hooks/use-toast';
import { saveRulesToDB } from "../indexedDB/useIndexedDB";
import { v4 as uuidv4 } from 'uuid';

// Define the input type for creating a rule, excluding server-generated fields
type CreateRuleInput = Omit<Rule, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'usage_data'>;

export function useCreateRule() {
  const queryClient = useQueryClient();

  return useMutation<Rule, Error, CreateRuleInput, { previousRules?: Rule[], optimisticRuleId?: string }>({
    onMutate: async (newRuleData) => {
      await queryClient.cancelQueries({ queryKey: ['rules'] });

      const previousRules = queryClient.getQueryData<Rule[]>(['rules']);
      const optimisticRuleId = uuidv4();
      const currentUser = (await supabase.auth.getUser()).data.user;

      const optimisticRule: Rule = {
        ...newRuleData,
        id: optimisticRuleId,
        user_id: currentUser?.id || '', // Add user_id if available
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Ensure all required fields from Rule interface are present with defaults if necessary
        // For example, if 'usage_data' is required but not in CreateRuleInput:
        usage_data: [], 
        // Add other defaults for non-optional fields not in CreateRuleInput
        // Example: these are from the table definition with defaults
        title_color: newRuleData.title_color || '#FFFFFF',
        subtext_color: newRuleData.subtext_color || '#FFFFFF',
        icon_color: newRuleData.icon_color || '#FFFFFF',
        calendar_color: newRuleData.calendar_color || '#9c7abb',
        background_opacity: newRuleData.background_opacity || 100,
        highlight_effect: newRuleData.highlight_effect || false,
        focal_point_x: newRuleData.focal_point_x || 50,
        focal_point_y: newRuleData.focal_point_y || 50,
        frequency_count: newRuleData.frequency_count || (newRuleData.frequency === 'daily' ? 1 : 3), // Example conditional default
      };

      queryClient.setQueryData<Rule[]>(['rules'], (oldRules = []) => [optimisticRule, ...oldRules]);

      return { previousRules, optimisticRuleId };
    },
    mutationFn: async (newRuleData) => {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Prepare data for Supabase, ensuring all non-nullable fields are present
      const ruleToInsert = {
        ...newRuleData,
        user_id: currentUser.id,
        // Ensure defaults for fields not in newRuleData but required by DB
        // These might overlap with optimisticRule defaults but are crucial for DB insert
        title_color: newRuleData.title_color || '#FFFFFF',
        subtext_color: newRuleData.subtext_color || '#FFFFFF',
        icon_color: newRuleData.icon_color || '#FFFFFF',
        calendar_color: newRuleData.calendar_color || '#9c7abb',
        background_opacity: newRuleData.background_opacity || 100,
        highlight_effect: newRuleData.highlight_effect || false,
        focal_point_x: newRuleData.focal_point_x || 50,
        focal_point_y: newRuleData.focal_point_y || 50,
        frequency_count: newRuleData.frequency_count || (newRuleData.frequency === 'daily' ? 1 : 3),
      };


      const { data, error } = await supabase
        .from("rules")
        .insert(ruleToInsert)
        .select()
        .single();

      if (error) {
        toast({
          title: 'Error Creating Rule',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }
      return data as Rule;
    },
    onSuccess: async (serverRule, _variables, context) => {
      // Replace optimistic rule with server rule
      queryClient.setQueryData<Rule[]>(['rules'], (oldRules = []) =>
        oldRules.map(rule => rule.id === context?.optimisticRuleId ? serverRule : rule)
      );

      const currentRules = queryClient.getQueryData<Rule[]>(['rules']) || [];
      try {
        await saveRulesToDB(currentRules);
      } catch (indexedDbError) {
        console.error('Failed to save rules to IndexedDB after creation:', indexedDbError);
        toast({
          title: 'Local Cache Error',
          description: 'Rule created on server, but failed to update local cache.',
          variant: 'default',
        });
      }

      toast({
        title: 'Rule Created',
        description: `Rule "${serverRule.title}" has been successfully created.`,
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousRules) {
        queryClient.setQueryData<Rule[]>(['rules'], context.previousRules);
      }
      // Avoid duplicate toasts if already handled in mutationFn
      if (!(error as Error).message.includes('Error Creating Rule')) {
        toast({
          title: 'Creation Failed',
          description: 'Could not create the rule. Please try again.',
          variant: 'destructive',
        });
      }
      console.error('Error creating rule (from onError):', (error as Error).message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
    },
  });
}
