
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { Rule, CreateRuleVariables, UpdateRuleVariables } from '@/data/rules/types'; // Import new types
import { RULES_QUERY_KEY } from '@/data/rules/queries'; // Assuming this exists or will be created

export const useRuleOperations = () => {
  const queryClient = useQueryClient();

  const saveRule = useCallback(
    async (ruleData: CreateRuleVariables | UpdateRuleVariables): Promise<Rule | null> => {
      try {
        let savedRule: Rule | null = null;
        if ('id' in ruleData && ruleData.id) {
          // Update existing rule
          const { id, ...updates } = ruleData as UpdateRuleVariables;
          const { data, error } = await supabase
            .from('rules')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          savedRule = data as Rule;
          toast({ title: 'Rule Updated', description: 'The rule has been successfully updated.' });
        } else {
          // Create new rule
          const { data, error } = await supabase
            .from('rules')
            .insert(ruleData as CreateRuleVariables)
            .select()
            .single();

          if (error) throw error;
          savedRule = data as Rule;
          toast({ title: 'Rule Created', description: 'The new rule has been successfully created.' });
        }
        
        if (savedRule) {
          queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });
        }
        return savedRule;

      } catch (e: unknown) {
        const descriptiveMessage = getErrorMessage(e);
        logger.error('Error saving rule:', descriptiveMessage, e);
        toast({ title: 'Save Error', description: descriptiveMessage, variant: 'destructive' });
        return null;
      }
    },
    [queryClient]
  );

  const deleteRule = useCallback(
    async (ruleId: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from('rules').delete().eq('id', ruleId);
        if (error) throw error;

        toast({ title: 'Rule Deleted', description: 'The rule has been successfully deleted.' });
        queryClient.invalidateQueries({ queryKey: RULES_QUERY_KEY });
        return true;
      } catch (e: unknown) {
        const descriptiveMessage = getErrorMessage(e);
        logger.error('Error deleting rule:', descriptiveMessage, e);
        toast({ title: 'Delete Error', description: descriptiveMessage, variant: 'destructive' });
        return false;
      }
    },
    [queryClient]
  );

  return { saveRule, deleteRule };
};
