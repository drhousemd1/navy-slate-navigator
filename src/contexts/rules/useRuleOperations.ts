
import { useCallback } from 'react';
// import { toast } from '@/hooks/use-toast'; // Toasts are now handled by mutation hooks or useRulesData
import { Rule } from '@/data/interfaces/Rule';
// Mutations are now called within useRulesData
// import { useCreateRule } from '@/data/rules/mutations/useCreateRule';
// import { useUpdateRule } from '@/data/rules/mutations/useUpdateRule';
// import { useDeleteRule } from '@/data/rules/mutations/useDeleteRule';
import { useRulesData } from '@/data/hooks/useRulesData'; // The main data handler

/**
 * @deprecated This hook is becoming a thin wrapper or might be obsolete.
 * Consider using `useRulesData` directly or integrating its logic into `RulesContext` initialization.
 */
export const useRuleOperations = () => {
  // This hook no longer manages its own state for 'rules'.
  // It delegates operations to useRulesData.
  const { 
    saveRule: saveData, 
    deleteRule: deleteData,
    // rules, // rules list comes from useRulesData directly in the context or page
    // isLoading, // same
    // error // same
  } = useRulesData(); 
  
  const createRule = useCallback(async (ruleData: Partial<Omit<Rule, 'id'>>) => {
    // The distinction between create and update is handled by saveData based on presence of id
    return saveData(ruleData);
  }, [saveData]);
  
  const updateRule = useCallback(async (ruleId: string, updates: Partial<Rule>) => {
    return saveData({ ...updates, id: ruleId });
  }, [saveData]);
  
  const deleteRule = useCallback(async (ruleId: string) => {
    await deleteData(ruleId);
    return true; // Matching original plan's expectation, though deleteData is void
  }, [deleteData]);
  
  return {
    // rules, // Not provided by this hook anymore directly
    // isLoading, // Not provided by this hook anymore directly
    // error, // Not provided by this hook anymore directly
    createRule, // This now effectively calls the saveRule from useRulesData
    updateRule, // This now effectively calls the saveRule from useRulesData
    deleteRule, // This now calls deleteRule from useRulesData
    // markRuleBroken and refetchRules should be accessed from useRulesData directly where needed
  };
};
