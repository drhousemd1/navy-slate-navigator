
import { useState, useCallback } from 'react';
import { Rule } from '@/data/interfaces/Rule'; // This is for the state and return types
import { useCreateRule } from '@/data/rules/mutations/useCreateRule';
import { useUpdateRule } from '@/data/rules/mutations/useUpdateRule';
import { useDeleteRule } from '@/data/rules/mutations/useDeleteRule';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors'; // Ensure this is imported
import { useAuth } from '@/contexts/auth';

export const useRuleOperations = (initialRules: Rule[] = []) => { // Added type for initialRules and default value
  const [rules, setRules] = useState<Rule[]>(initialRules); // Explicitly type useState
  const { mutateAsync: createRuleMutation } = useCreateRule();
  const { mutateAsync: updateRuleMutation } = useUpdateRule();
  const { mutateAsync: deleteRuleMutation } = useDeleteRule();
  const { user } = useAuth();
  
  // Create a new rule
  const createRule = useCallback(async (ruleData: Partial<Rule>): Promise<Rule | undefined> => {
    try {
      if (!user?.id) {
        throw new Error('User must be authenticated to create rules');
      }

      // Assuming createRuleMutation returns the created Rule matching the 'Rule' interface
      const newRule: Rule = await createRuleMutation({
        ...ruleData,
        user_id: user.id // Add the required user_id field
      }); 
      
      // newRule might be undefined if mutation doesn't return on success or type is different
      // For now, we assume it returns Rule. If not, the return type of createRule needs adjustment.
      if (newRule) { 
        // Toast is now handled by the optimistic mutation - no duplicate toast here
        // If rules state needs to be updated manually:
        // setRules(prevRules => [...prevRules, newRule]); 
        return newRule;
      }
    } catch (error: unknown) { 
      logger.error('Error creating rule:', getErrorMessage(error)); // Use getErrorMessage
      // Error handling is already done in useCreateRule - no duplicate toast here
      // throw error; // Re-throwing might be desired depending on caller's needs
    }
    return undefined; // Explicitly return undefined if creation fails or no new rule
  }, [createRuleMutation, user]);
  
  // Update an existing rule
  const updateRule = useCallback(async (ruleId: string, updates: Partial<Rule>): Promise<Rule | undefined> => {
    try {
      // Assuming updateRuleMutation returns the updated Rule matching the 'Rule' interface
      const updatedRule: Rule = await updateRuleMutation({ id: ruleId, ...updates });
      
      if (updatedRule) {
        // Toast is now handled by the optimistic mutation - no duplicate toast here
        // If rules state needs to be updated manually:
        // setRules(prevRules => prevRules.map(r => r.id === ruleId ? updatedRule : r));
        return updatedRule;
      }
    } catch (error: unknown) { 
      logger.error('Error updating rule:', getErrorMessage(error)); // Use getErrorMessage
      // Error handling is already done in useUpdateRule - no duplicate toast here
      // throw error;
    }
    return undefined; // Explicitly return undefined if update fails
  }, [updateRuleMutation]);
  
  // Delete a rule
  const deleteRule = useCallback(async (ruleId: string): Promise<boolean> => {
    try {
      await deleteRuleMutation(ruleId);
      
      // Toast is now handled by the optimistic mutation - no duplicate toast here
      // If rules state needs to be updated manually:
      // setRules(prevRules => prevRules.filter(r => r.id !== ruleId));
      return true;
    } catch (error: unknown) { 
      logger.error('Error deleting rule:', getErrorMessage(error)); // Use getErrorMessage
      // Error handling is already done in useDeleteRule - no duplicate toast here
      // throw error;
      return false;
    }
  }, [deleteRuleMutation]);
  
  return {
    rules,
    createRule,
    updateRule,
    deleteRule,
    // It might be useful to also return setRules if external updates are needed,
    // or a refetch function if this hook managed its own data fetching.
    // For now, it only manages operations.
  };
};
