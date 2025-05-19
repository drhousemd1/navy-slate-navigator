
import { useCallback } from 'react';
// import { toast } from '@/hooks/use-toast'; // Toasts are now handled by useRulesData or optimistic hooks
import { Rule } from '@/data/interfaces/Rule';
// Import the main context hook which gets its functions from useRulesData
import { useRules as useRulesContext } from '@/contexts/RulesContext'; 

// This hook now acts as a layer over the context, if specific component logic needs these operations
// without directly consuming the whole context. Or it might be that this hook is not strictly needed
// if components can directly use useRulesContext().

export const useRuleOperations = () => { // Removed initialRules, as state is managed by React Query via useRulesData
  const { saveRule: contextSaveRule, deleteRule: contextDeleteRule } = useRulesContext();
  
  const createRule = useCallback(async (ruleData: Partial<Omit<Rule, 'id'>>) => {
    // saveRule from context handles both create and update.
    // For a dedicated create, we pass data without an ID.
    return contextSaveRule(ruleData);
  }, [contextSaveRule]);
  
  const updateRule = useCallback(async (ruleId: string, updates: Partial<Omit<Rule, 'id'>>) => {
    // saveRule from context handles both create and update.
    // For update, we pass data with an ID.
    return contextSaveRule({ id: ruleId, ...updates });
  }, [contextSaveRule]);
  
  const deleteRule = useCallback(async (ruleId: string) => {
    // contextDeleteRule now returns Promise<boolean>
    return contextDeleteRule(ruleId);
  }, [contextDeleteRule]);
  
  // The 'rules' state (useState(initialRules)) previously here is no longer needed
  // as the source of truth for rules comes from useRulesContext() -> useRulesData() -> React Query.
  // If local state manipulation was intended, that pattern changes with centralized data.

  return {
    // rules: rulesFromContext, // If components using this hook need access to rules list
    createRule,
    updateRule,
    deleteRule
  };
};
