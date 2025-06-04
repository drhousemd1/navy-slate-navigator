
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { loadRulesFromDB, saveRulesToDB } from '@/data/indexedDB/useIndexedDB';
import { todayKey, currentWeekKey } from '@/lib/taskUtils';

/**
 * Reset rule usage data for rules with specified frequency
 * @param frequency - 'daily' or 'weekly'
 */
export const resetRuleUsageData = async (frequency: 'daily' | 'weekly'): Promise<void> => {
  try {
    logger.debug(`[resetRuleUsageData] Resetting ${frequency} rule usage data`);
    
    // Get the current authenticated session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.id) {
      logger.debug(`[resetRuleUsageData] No authenticated user, exiting early`);
      return;
    }

    const userId = session.user.id;

    // Fetch all rules matching frequency and user_id from Supabase
    const { data: rules, error: fetchError } = await supabase
      .from('rules')
      .select('*')
      .eq('frequency', frequency)
      .eq('user_id', userId);

    if (fetchError) {
      logger.error(`[resetRuleUsageData] Error fetching ${frequency} rules:`, fetchError);
      throw fetchError;
    }

    if (!rules || rules.length === 0) {
      logger.debug(`[resetRuleUsageData] No ${frequency} rules found for user, exiting early`);
      return;
    }

    // Update those specific rules with usage_data: []
    const { error: updateError } = await supabase
      .from('rules')
      .update({ usage_data: [] })
      .eq('frequency', frequency)
      .eq('user_id', userId);

    if (updateError) {
      logger.error(`[resetRuleUsageData] Error resetting ${frequency} rule usage data:`, updateError);
      throw updateError;
    }

    // Sync updated rules to IndexedDB
    const existingRules = await loadRulesFromDB();
    if (existingRules && Array.isArray(existingRules)) {
      // Update the existing rules with reset usage_data
      const updatedRules = existingRules.map(rule => {
        if (rule.frequency === frequency && rule.user_id === userId) {
          return { ...rule, usage_data: [] };
        }
        return rule;
      });
      
      await saveRulesToDB(updatedRules);
      logger.debug(`[resetRuleUsageData] Synced updated ${frequency} rules to IndexedDB`);
    }

    logger.debug(`[resetRuleUsageData] Successfully reset ${frequency} rule usage data`);
  } catch (error) {
    logger.error(`[resetRuleUsageData] Failed to reset ${frequency} rule usage data:`, getErrorMessage(error));
    throw error;
  }
};

/**
 * Check if rule resets are needed and perform them
 * @returns boolean indicating whether any reset was performed
 */
export const checkAndPerformRuleResets = async (): Promise<boolean> => {
  try {
    const currentDaily = todayKey();
    const currentWeekly = currentWeekKey();
    
    const lastDaily = localStorage.getItem('lastDaily');
    const lastWeekly = localStorage.getItem('lastWeek');

    let resetPerformed = false;

    // Check for daily reset
    if (lastDaily !== currentDaily) {
      logger.debug('[checkAndPerformRuleResets] Performing daily rule reset');
      await resetRuleUsageData('daily');
      localStorage.setItem('lastDaily', currentDaily);
      resetPerformed = true;
    }

    // Check for weekly reset
    if (lastWeekly !== currentWeekly) {
      logger.debug('[checkAndPerformRuleResets] Performing weekly rule reset');
      await resetRuleUsageData('weekly');
      localStorage.setItem('lastWeek', currentWeekly);
      resetPerformed = true;
    }

    return resetPerformed;
  } catch (error) {
    logger.error('[checkAndPerformRuleResets] Error during rule resets:', getErrorMessage(error));
    // Don't throw - we don't want to break the app if reset fails
    return false;
  }
};
