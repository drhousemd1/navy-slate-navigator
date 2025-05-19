
import React, { createContext, useContext, ReactNode } from 'react';
import { QueryObserverResult } from '@tanstack/react-query';
// import { toast } from '@/hooks/use-toast'; // Toasts handled deeper
import { Rule } from '@/data/interfaces/Rule';
import { useRulesData } from '@/data/hooks/useRulesData'; // Central hook for rules data logic

// Define the context type
interface RulesContextType {
  rules: Rule[];
  isLoading: boolean;
  error: Error | null;
  saveRule: (ruleData: Partial<Rule>) => Promise<Rule>; // from useRulesData
  deleteRule: (ruleId: string) => Promise<void>; // from useRulesData, changed from boolean
  markRuleBroken: (rule: Rule) => Promise<void>; // from useRulesData
  refetchRules: () => Promise<QueryObserverResult<Rule[], Error>>; // from useRulesData
}

const RulesContext = createContext<RulesContextType | undefined>(undefined);

export const RulesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // useRulesData is now the single source of truth for data operations and state
  const { 
    rules, 
    isLoading, 
    error, 
    saveRule, 
    deleteRule, 
    markRuleBroken,
    refetchRules 
  } = useRulesData();

  // The value passed to the provider comes directly from useRulesData
  const value: RulesContextType = {
    rules,
    isLoading,
    error,
    saveRule,
    deleteRule,
    markRuleBroken,
    refetchRules
  };

  return (
    <RulesContext.Provider value={value}>
      {children}
    </RulesContext.Provider>
  );
};

// This hook is used by components to access the rules context
export const useRules = (): RulesContextType => {
  const context = useContext(RulesContext);
  if (context === undefined) {
    throw new Error('useRules must be used within a RulesProvider');
  }
  return context;
};
