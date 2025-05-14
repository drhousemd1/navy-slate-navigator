
import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, RefetchOptions, QueryObserverResult } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Rule } from '@/data/interfaces/Rule';
import { useRulesData } from '@/data/hooks/useRulesData';
import { usePreloadRules } from "@/data/preload/usePreloadRules";

// Define the context type
interface RulesContextType {
  rules: Rule[];
  isLoading: boolean;
  error: Error | null;
  saveRule: (ruleData: Partial<Rule>) => Promise<Rule>;
  deleteRule: (ruleId: string) => Promise<boolean>;
  markRuleBroken: (rule: Rule) => Promise<void>;
  refetchRules: (options?: RefetchOptions) => Promise<QueryObserverResult<Rule[], Error>>;
}

const RulesContext = createContext<RulesContextType | undefined>(undefined);

export const RulesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get the preload function
  const preloadRules = usePreloadRules();

  // Run it once when provider mounts
  useEffect(() => {
    preloadRules();
  }, [preloadRules]);

  const { 
    rules: fetchedRules, 
    isLoading, 
    error, 
    saveRule, 
    deleteRule, 
    markRuleBroken,
    refetchRules: refetchRulesData 
  } = useRulesData();
  
  // Ensure rules is always an array
  const rules: Rule[] = Array.isArray(fetchedRules) ? fetchedRules : [];
  
  // Wrapper for the refetch function to ensure correct typing
  const refetchRules = async (options?: RefetchOptions): Promise<QueryObserverResult<Rule[], Error>> => {
    const result = await refetchRulesData(options);
    return result as unknown as QueryObserverResult<Rule[], Error>;
  };

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
