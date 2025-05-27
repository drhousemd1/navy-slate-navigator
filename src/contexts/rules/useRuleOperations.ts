import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useCreateRule } from '@/data/rules/mutations/useCreateRule';
import { useUpdateRule } from '@/data/rules/mutations/useUpdateRule';
import { useDeleteRule } from '@/data/rules/mutations/useDeleteRule';
import { logger } from '@/lib/logger';

export const useRuleOperations = (initialRules = []) => {
  const [rules, setRules] = useState(initialRules);
  const { mutateAsync: createRuleMutation } = useCreateRule();
  const { mutateAsync: updateRuleMutation } = useUpdateRule();
  const { mutateAsync: deleteRuleMutation } = useDeleteRule();
  
  // Create a new rule
  const createRule = useCallback(async (ruleData: any) => {
    try {
      const newRule = await createRuleMutation(ruleData);
      
      if (newRule) {
        toast({
          title: "Rule Created",
          description: `${ruleData.title || 'The new rule'} has been added.`,
        });
        return newRule;
      }
    } catch (error) {
      logger.error('Error creating rule:', error);
      toast({
        title: 'Error Creating Rule',
        description: (error instanceof Error && error.message) ? error.message : 'Failed to create rule. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [createRuleMutation]);
  
  // Update an existing rule
  const updateRule = useCallback(async (ruleId: string, updates: any) => {
    try {
      const updatedRule = await updateRuleMutation({ id: ruleId, ...updates });
      
      if (updatedRule) {
        toast({
          title: "Rule Updated",
          description: `${updates.title || 'The rule'} has been updated.`,
        });
        return updatedRule;
      }
    } catch (error) {
      logger.error('Error updating rule:', error);
      toast({
        title: 'Error Updating Rule',
        description: (error instanceof Error && error.message) ? error.message : 'Failed to update rule. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [updateRuleMutation]);
  
  // Delete a rule
  const deleteRule = useCallback(async (ruleId: string) => {
    try {
      await deleteRuleMutation(ruleId);
      toast({
        title: "Rule Deleted",
        description: "The rule has been successfully deleted.",
      });
      return true;
    } catch (error) {
      logger.error('Error deleting rule:', error);
      toast({
        title: 'Error Deleting Rule',
        description: (error instanceof Error && error.message) ? error.message : 'Failed to delete rule. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [deleteRuleMutation]);
  
  return {
    rules,
    setRules,
    createRule,
    updateRule,
    deleteRule
  };
};
