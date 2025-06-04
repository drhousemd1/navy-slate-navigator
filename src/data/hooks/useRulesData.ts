
import { useCallback } from 'react';
import { useRules } from '../rules/queries';
import { Rule } from '@/data/interfaces/Rule';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { saveRulesToDB, loadRulesFromDB } from '@/data/indexedDB/useIndexedDB';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { checkAndPerformRuleResets } from '@/lib/rulesUtils';
import { useCreateRule, useUpdateRule, useDeleteRule, CreateRuleVariables, UpdateRuleVariables } from '../rules/mutations';
import { useCreateRuleViolation } from '../rules/mutations/useCreateRuleViolation';
import { useAuth } from '@/contexts/auth';

export const useRulesData = () => {
  const { 
    data: rules = [], 
    isLoading, 
    error, 
    refetch,
    isStale,
    dataUpdatedAt,
    errorUpdateCount
  } = useRules();
  
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const { mutateAsync: createRuleMutation } = useCreateRule();
  const { mutateAsync: updateRuleMutation } = useUpdateRule();
  const { mutateAsync: deleteRuleMutation } = useDeleteRule();
  const { mutateAsync: createRuleViolationMutation } = useCreateRuleViolation();

  // Enhanced rule loading with reset check and complete cache invalidation
  const checkAndReloadRules = useCallback(async () => {
    try {
      logger.debug('[useRulesData] Checking for rule resets');
      
      await checkAndPerformRuleResets();
      
      logger.debug('[useRulesData] Resets performed, invalidating cache and reloading fresh data');
      
      // Force complete cache invalidation for rules
      await queryClient.invalidateQueries({ queryKey: ['rules'] });
      
      // Reload fresh data from IndexedDB after resets
      const freshData = await loadRulesFromDB();
      
      if (freshData && Array.isArray(freshData)) {
        // Update React Query cache with fresh data
        queryClient.setQueryData(['rules'], freshData);
        logger.debug('[useRulesData] Updated cache with fresh reset data');
      }
      
      // Force a refetch to ensure we have the latest data from server
      await refetch();
    } catch (error) {
      logger.error('[useRulesData] Error during reset check:', error);
    }
  }, [queryClient, refetch]);

  const saveRule = async (ruleData: Partial<Rule>): Promise<Rule> => {
    try {
      // Check for resets before saving
      await checkAndReloadRules();
      
      if (ruleData.id) {
        const { id, ...updates } = ruleData;
        return await updateRuleMutation({ id, ...updates } as UpdateRuleVariables);
      } else {
        if (!user?.id) {
          throw new Error('User must be authenticated to create rules');
        }

        const createVariables: CreateRuleVariables = {
          title: ruleData.title || 'Untitled Rule',
          user_id: user.id,
          description: ruleData.description,
          priority: ruleData.priority || 'medium',
          frequency: ruleData.frequency || 'daily',
          frequency_count: ruleData.frequency_count || 1,
          icon_name: ruleData.icon_name,
          icon_url: ruleData.icon_url,
          icon_color: ruleData.icon_color || '#FFFFFF',
          title_color: ruleData.title_color || '#FFFFFF', 
          subtext_color: ruleData.subtext_color || '#FFFFFF',
          calendar_color: ruleData.calendar_color || '#9c7abb',
          background_image_url: ruleData.background_image_url,
          background_opacity: ruleData.background_opacity === undefined ? 100 : ruleData.background_opacity,
          highlight_effect: ruleData.highlight_effect === undefined ? false : ruleData.highlight_effect,
          focal_point_x: ruleData.focal_point_x === undefined ? 50 : ruleData.focal_point_x,
          focal_point_y: ruleData.focal_point_y === undefined ? 50 : ruleData.focal_point_y,
        };
        return await createRuleMutation(createVariables);
      }
    } catch (e: unknown) {
      const errorMessage = getErrorMessage(e);
      logger.error('[useRulesData] Error saving rule:', errorMessage);
      toast({
        title: 'Error Saving Rule',
        description: errorMessage,
        variant: 'destructive',
      });
      throw e;
    }
  };

  const deleteRule = async (ruleId: string): Promise<boolean> => {
    try {
      await deleteRuleMutation(ruleId);
      return true;
    } catch (e: unknown) {
      const errorMessage = getErrorMessage(e);
      logger.error('[useRulesData] Error deleting rule:', errorMessage);
      toast({
        title: 'Error Deleting Rule',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  };

  const markRuleBroken = async (rule: Rule): Promise<void> => {
    try {
      await createRuleViolationMutation({ rule_id: rule.id });

      const newUsageDataEntry = Date.now(); 
      const currentUsageData = Array.isArray(rule.usage_data) ? rule.usage_data : [];
      const newUsageData = [...currentUsageData, newUsageDataEntry] as number[] & {toJSON?: () => any};

      await updateRuleMutation({
        id: rule.id,
        usage_data: newUsageData,
      });

      toast({
        title: "Rule Marked Broken",
        description: `${rule.title} marked as broken. Violation recorded and usage updated.`,
      });

    } catch (e: unknown) {
      const errorMessage = getErrorMessage(e);
      logger.error('[useRulesData] Error marking rule broken:', errorMessage);
      toast({
        title: 'Error',
        description: `Failed to mark rule "${rule.title}" as broken: ${errorMessage}`,
        variant: 'destructive',
      });
      throw e;
    }
  };

  // Check if we're using cached data
  const isUsingCachedData = 
    (!!error && rules.length > 0) || 
    (isStale && errorUpdateCount > 0 && rules.length > 0);
  
  return {
    rules,
    isLoading,
    error,
    isUsingCachedData,
    saveRule,
    deleteRule,
    markRuleBroken,
    refetch,
    checkAndReloadRules
  };
};
