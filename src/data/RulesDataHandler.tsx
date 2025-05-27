
import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryResult, DefinedUseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Rule, CreateRuleVariables, UpdateRuleVariables, RuleFormValues } from './rules/types'; // Corrected import
import { fetchRules, parseRuleData } from './rules/queries'; // Assuming parseRuleData is exported from queries
import { useCreateRule, useUpdateRule, useDeleteRule } from './rules/mutations';
// import { CreateRuleViolationVariables } from './rules/types'; // This type might not exist or is named differently. Let's assume it's not used for now or handled by a specific mutation.
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { toast } from '@/hooks/use-toast';

interface RulesContextType {
  rules: Rule[];
  isLoading: boolean;
  error: Error | null;
  refetchRules: () => void;
  addRule: (ruleData: CreateRuleVariables) => Promise<Rule | undefined>;
  updateRule: (ruleData: UpdateRuleVariables) => Promise<Rule | undefined>;
  deleteRule: (ruleId: string) => Promise<void>;
  // recordRuleViolation?: (violationData: CreateRuleViolationVariables) => Promise<void>; // If this function is needed, its type needs to be defined.
}

const RulesContext = createContext<RulesContextType | undefined>(undefined);

export const RulesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading, error, refetch } = useQuery<Rule[], Error, Rule[]>({
    queryKey: ['rules'],
    queryFn: fetchRules, // fetchRules should return Promise<Rule[]>
  });

  const createRuleMutation = useCreateRule();
  const updateRuleMutation = useUpdateRule();
  const deleteRuleMutation = useDeleteRule();

  const addRule = async (ruleData: CreateRuleVariables) => {
    try {
      return await createRuleMutation.mutateAsync(ruleData);
    } catch (e: unknown) {
      logger.error('Error adding rule:', getErrorMessage(e), e);
      toast({ title: "Error", description: `Failed to add rule: ${getErrorMessage(e)}`, variant: "destructive" });
    }
  };

  const updateRule = async (ruleData: UpdateRuleVariables) => {
     try {
      return await updateRuleMutation.mutateAsync(ruleData);
    } catch (e: unknown) {
      logger.error('Error updating rule:', getErrorMessage(e), e);
      toast({ title: "Error", description: `Failed to update rule: ${getErrorMessage(e)}`, variant: "destructive" });
    }
  };

  const deleteRuleFunc = async (ruleId: string) => { // Renamed to avoid conflict with deleteRule from useDeleteRule
    try {
      await deleteRuleMutation.mutateAsync(ruleId);
    } catch (e: unknown) {
      logger.error('Error deleting rule:', getErrorMessage(e), e);
      toast({ title: "Error", description: `Failed to delete rule: ${getErrorMessage(e)}`, variant: "destructive" });
    }
  };
  
  // recordRuleViolation implementation would go here if needed.

  return (
    <RulesContext.Provider value={{ rules, isLoading, error: error || null, refetchRules: refetch, addRule, updateRule, deleteRule: deleteRuleFunc }}>
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

