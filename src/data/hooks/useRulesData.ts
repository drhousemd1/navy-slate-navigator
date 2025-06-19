
import { useCallback } from 'react';
import { useRules } from '../rules/queries';
import { Rule } from '@/data/interfaces/Rule';
import { useQueryClient } from '@tanstack/react-query';
import { toastManager } from '@/lib/toastManager';
import { saveRulesToDB, loadRulesFromDB } from '@/data/indexedDB/useIndexedDB';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { checkAndPerformRuleResets } from '@/lib/rulesUtils';
import { useCreateRule, useUpdateRule, useDeleteRule, CreateRuleVariables, UpdateRuleVariables } from '../rules/mutations';
import { useCreateRuleViolation } from '../rules/mutations/useCreateRuleViolation';
import { useAuth } from '@/contexts/auth';
import { getMondayBasedDay } from '@/lib/utils';
import { useUserIds } from '@/contexts/UserIdsContext';
import { RULES_QUERY_KEY } from '../rules/queries';

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
  const { subUserId, domUserId } = useUserIds();
  
  const { mutateAsync: createRuleMutation } = useCreateRule();
  const { mutateAsync: updateRuleMutation } = useUpdateRule();
  const { mutateAsync: deleteRuleMutation } = useDeleteRule();
  const { mutateAsync: createRuleViolationMutation } = useCreateRuleViolation();

  // Fixed rule loading - only update cache if resets were actually performed
  const checkAndReloadRules = useCallback(async () => {
    try {
      logger.debug('[useRulesData] Checking for rule resets');
      
      // Call checkAndPerformRuleResets and capture the boolean result
      const resetPerformed = await checkAndPerformRuleResets();
      
      // Only if resetPerformed is true, update cache with fresh IndexedDB data
      if (resetPerformed) {
        logger.debug('[useRulesData] Resets performed, updating cache with fresh IndexedDB data');
        
        // Load fresh rules from IndexedDB and set them on the cache with correct query key
        const freshData = await loadRulesFromDB();
        if (freshData && Array.isArray(freshData)) {
          queryClient.setQueryData([...RULES_QUERY_KEY, subUserId, domUserId], freshData);
          logger.debug('[useRulesData] Updated cache with fresh reset data');
        }
      } else {
        logger.debug('[useRulesData] No resets needed, keeping existing cache');
      }
    } catch (error) {
      logger.error('[useRulesData] Error during reset check:', error);
    }
  }, [queryClient, subUserId, domUserId]);

  const saveRule = async (ruleData: Partial<Rule>): Promise<Rule> => {
    try {
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
      toastManager.error('Error Saving Rule', errorMessage);
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
      toastManager.error('Error Deleting Rule', errorMessage);
      return false;
    }
  };

  const markRuleBroken = async (rule: Rule): Promise<void> => {
    try {
      if (!user?.id) {
        throw new Error('User must be authenticated to mark rule as broken');
      }

      await createRuleViolationMutation({ 
        ruleId: rule.id, 
        userId: user.id 
      });

      // Get current day of week (0=Monday, 6=Sunday)
      const currentDay = getMondayBasedDay();
      
      // Initialize usage_data as 7-element array if not already
      const currentUsageData = Array.isArray(rule.usage_data) ? rule.usage_data : [];
      const newUsageData = new Array(7).fill(0);
      
      // Copy existing data if it exists and is properly formatted
      if (currentUsageData.length === 7) {
        for (let i = 0; i < 7; i++) {
          newUsageData[i] = currentUsageData[i] || 0;
        }
      }
      
      // Mark current day as violated (set to 1)
      newUsageData[currentDay] = 1;

      await updateRuleMutation({
        id: rule.id,
        usage_data: newUsageData as number[] & {toJSON?: () => any},
      });

      toastManager.success("Rule Marked Broken", `${rule.title} marked as broken. Violation recorded and usage updated.`);

    } catch (e: unknown) {
      const errorMessage = getErrorMessage(e);
      logger.error('[useRulesData] Error marking rule broken:', errorMessage);
      toastManager.error('Error', `Failed to mark rule "${rule.title}" as broken: ${errorMessage}`);
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
