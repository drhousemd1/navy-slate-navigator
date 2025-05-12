
import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient, RefetchOptions, QueryObserverResult } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Rule } from '@/data/interfaces/Rule';
import { useRulesData } from '@/data/hooks/useRulesData';

// Define the context type
interface RulesContextType {
  rules: Rule[];
  isLoading: boolean;
  error: Error | null;
  saveRule: (ruleData: Partial<Rule>) => Promise<Rule>;
  deleteRule: (ruleId: string) => Promise<boolean>;
  markRuleBroken: (rule: Rule) => Promise<void>;
  refetchRules: () => Promise<QueryObserverResult<Rule[], Error>>;
}

const RulesContext = createContext<RulesContextType | undefined>(undefined);

export const RulesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { 
    rules, 
    isLoading, 
    error, 
    saveRule, 
    deleteRule, 
    markRuleBroken,
    refetchRules 
  } = useRulesData();

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

export const useRules = (): RulesContextType => {
  const context = useContext(RulesContext);
  if (context === undefined) {
    throw new Error('useRules must be used within a RulesProvider');
  }
  return context;
};
