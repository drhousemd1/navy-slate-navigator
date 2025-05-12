
import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { Rule } from '@/data/interfaces/Rule';
import { createRuleInDb, updateRuleInDb, deleteRuleInDb } from '@/data/RulesDataHandler';

export const useRuleOperations = (initialRules = []) => {
  const [rules, setRules] = useState(initialRules);
  
  // Create a new rule
  const createRule = useCallback(async (ruleData) => {
    try {
      const success = await createRuleInDb(ruleData);
      
      if (success) {
        toast({
          title: "Rule Created",
          description: `${ruleData.title} has been added to your rules.`,
        });
        return success;
      }
    } catch (error) {
      console.error('Error creating rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create rule. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }, []);
  
  // Update an existing rule
  const updateRule = useCallback(async (ruleId, updates) => {
    try {
      const success = await updateRuleInDb(ruleId, updates);
      
      if (success) {
        toast({
          title: "Rule Updated",
          description: `${updates.title || 'Rule'} has been updated.`,
        });
        return success;
      }
    } catch (error) {
      console.error('Error updating rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update rule. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }, []);
  
  // Delete a rule
  const deleteRule = useCallback(async (ruleId) => {
    try {
      const success = await deleteRuleInDb(ruleId);
      
      if (success) {
        toast({
          title: "Rule Deleted",
          description: "The rule has been deleted.",
        });
        return success;
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete rule. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  }, []);
  
  return {
    rules,
    createRule,
    updateRule,
    deleteRule
  };
};
