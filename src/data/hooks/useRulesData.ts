import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule, CreateRuleVariables, UpdateRuleVariables, RuleFormValues } from '@/data/rules/types'; // Centralized types
import { parseRuleData } from '@/data/rules/queries'; // Assuming parseRuleData is in queries
import { useCreateRule } from '@/data/rules/mutations/useCreateRule';
import { useUpdateRule } from '@/data/rules/mutations/useUpdateRule';
import { useDeleteRule as useDeleteRuleMutation } from '@/data/rules/mutations/useDeleteRule';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { toast } from '@/hooks/use-toast';

export const RULES_QUERY_KEY = ['rules'];

// Assuming fetchRules is defined in queries.ts or similar
async function fetchRulesForHook(): Promise<Rule[]> {
  try {
    const { data, error } = await supabase.from('rules').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data?.map(parseRuleData) || []; // parseRuleData needs to handle RawSupabaseRule
  } catch (error: unknown) {
    logger.error('Error fetching rules:', getErrorMessage(error));
    throw error; // Re-throw for react-query
  }
}

export function useRulesData() {
  const queryClient = useQueryClient();
  const { data: rules = [], isLoading, error, refetch } = useQuery<Rule[], Error>({
    queryKey: RULES_QUERY_KEY,
    queryFn: fetchRulesForHook, // Use the local fetch function
  });

  const createRuleMutation = useCreateRule();
  const updateRuleMutation = useUpdateRule();
  const deleteRuleMutation = useDeleteRuleMutation();

  const saveRule = async (ruleData: RuleFormValues | (RuleFormValues & { id: string })) => {
    if ('id' in ruleData && ruleData.id) {
      // Update
      const { id, ...restOfRuleData } = ruleData;
      const payload: UpdateRuleVariables = { id, ...restOfRuleData };
      await updateRuleMutation.mutateAsync(payload);
    } else {
      // Create
      const payload: CreateRuleVariables = {
        ...ruleData,
        // Ensure all non-nullable fields for 'rules' table are present
        title: ruleData.title || 'Untitled Rule',
        points_impact: ruleData.points_impact || 0,
        category: ruleData.category || 'general',
        // Add other defaults if necessary based on your 'rules' table schema
      };
      await createRuleMutation.mutateAsync(payload);
    }
  };

  const deleteRule = async (ruleId: string) => {
    await deleteRuleMutation.mutateAsync(ruleId);
  };

  // recordRuleViolation might be better handled in a specific mutation hook or context
  // For now, keeping it here if it's simple, but consider refactoring
  const recordRuleViolation = async (ruleId: string, userId: string, notes?: string) => {
    try {
      const { error } = await supabase.from('rule_violations').insert({
        rule_id: ruleId,
        user_id: userId,
        notes: notes,
        violation_date: new Date().toISOString(),
      });
      if (error) throw error;
      toast({ title: 'Violation Recorded', description: 'The rule violation has been logged.' });
      // Optionally, invalidate queries that depend on violation data
      queryClient.invalidateQueries({ queryKey: ['rule_violations', ruleId] }); // Example
      queryClient.invalidateQueries({ queryKey: ['userPoints', userId] }); // If points change
    } catch (e: unknown) {
      const message = getErrorMessage(e);
      toast({ title: 'Error Recording Violation', description: message, variant: 'destructive' });
      logger.error('Error recording rule violation:', message, e);
    }
  };

  return {
    rules,
    isLoading,
    error,
    refetchRules: refetch,
    saveRule,
    deleteRule,
    recordRuleViolation, // Export if needed by components
  };
}
