
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { Rule } from '@/data/interfaces/Rule';
import { useCreateRule } from '@/data/rules/mutations/useCreateRule';
import { useUpdateRule } from '@/data/rules/mutations/useUpdateRule';
import { useDeleteRule } from '@/data/rules/mutations/useDeleteRule';
import { logger } from '@/lib/logger'; // Added import

export const useRuleOperations = (initialRules = []) => {
  const [rules, setRules] = useState(initialRules);
  const { mutateAsync: createRuleMutation } = useCreateRule();
  const { mutateAsync: updateRuleMutation } = useUpdateRule();
  const { mutateAsync: deleteRuleMutation } = useDeleteRule();
  
  // Create a new rule
  const createRule = useCallback(async (ruleData: any) => { // Added type for ruleData
    try {
      const newRule = await createRuleMutation(ruleData);
      
      if (newRule) {
        toast({
          title: "Rule Created",
          description: `${ruleData.title} has been added to your rules.`,
        });
        return newRule;
      }
    } catch (error) {
      logger.error('Error creating rule:', error); // Replaced console.error
      toast({
        title: 'Error',
        description: 'Failed to create rule. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [createRuleMutation]);
  
  // Update an existing rule
  const updateRule = useCallback(async (ruleId: string, updates: any) => { // Added types
    try {
      const updatedRule = await updateRuleMutation({ id: ruleId, ...updates });
      
      if (updatedRule) {
        toast({
          title: "Rule Updated",
          description: `${updates.title || 'Rule'} has been updated.`,
        });
        return updatedRule;
      }
    } catch (error) {
      logger.error('Error updating rule:', error); // Replaced console.error
      toast({
        title: 'Error',
        description: 'Failed to update rule. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [updateRuleMutation]);
  
  // Delete a rule
  const deleteRule = useCallback(async (ruleId: string) => { // Added type
    try {
      await deleteRuleMutation(ruleId);
      
      toast({
        title: "Rule Deleted",
        description: "The rule has been deleted.",
      });
      return true;
    } catch (error) {
      logger.error('Error deleting rule:', error); // Replaced console.error
      toast({
        title: 'Error',
        description: 'Failed to delete rule. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }, [deleteRuleMutation]);
  
  return {
    rules,
    createRule,
    updateRule,
    deleteRule
  };
};
