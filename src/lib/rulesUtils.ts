
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { loadRulesFromDB, saveRulesToDB } from '@/data/indexedDB/useIndexedDB';
import { todayKey, currentWeekKey } from '@/lib/taskUtils';

/**
 * Force reset ALL rule usage data to clear any existing violation data
 */
export const forceResetAllRuleUsageData = async (): Promise<void> => {
  try {
    logger.debug(`[forceResetAllRuleUsageData] Force resetting ALL rule usage data`);
    
    // Get the current authenticated session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.id) {
      logger.debug(`[forceResetAllRuleUsageData] No authenticated user, exiting early`);
      return;
    }

    const userId = session.user.id;

    // Update ALL rules with usage_data: [0,0,0,0,0,0,0] (7-element array for Mon-Sun)
    const { error: updateError } = await supabase
      .from('rules')
      .update({ usage_data: [0, 0, 0, 0, 0, 0, 0] })
      .eq('user_id', userId);

    if (updateError) {
      logger.error(`[forceResetAllRuleUsageData] Error force resetting rule usage data:`, updateError);
      throw updateError;
    }

    // Sync updated rules to IndexedDB
    const existingRules = await loadRulesFromDB();
    if (existingRules && Array.isArray(existingRules)) {
      // Update the existing rules with reset usage_data
      const updatedRules = existingRules.map(rule => {
        if (rule.user_id === userId) {
          return { ...rule, usage_data: [0, 0, 0, 0, 0, 0, 0] };
        }
        return rule;
      });
      
      await saveRulesToDB(updatedRules);
      logger.debug(`[forceResetAllRuleUsageData] Synced force reset rules to IndexedDB`);
    }

    logger.debug(`[forceResetAllRuleUsageData] Successfully force reset ALL rule usage data`);
  } catch (error) {
    logger.error(`[forceResetAllRuleUsageData] Failed to force reset rule usage data:`, getErrorMessage(error));
    throw error;
  }
};

/**
 * Reset rule usage data (weekly reset for all rules)
 */
export const resetRuleUsageData = async (): Promise<void> => {
  try {
    logger.debug(`[resetRuleUsageData] Resetting rule usage data`);
    
    // Get the current authenticated session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.id) {
      logger.debug(`[resetRuleUsageData] No authenticated user, exiting early`);
      return;
    }

    const userId = session.user.id;

    // Fetch all rules for the user from Supabase
    const { data: rules, error: fetchError } = await supabase
      .from('rules')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      logger.error(`[resetRuleUsageData] Error fetching rules:`, fetchError);
      throw fetchError;
    }

    if (!rules || rules.length === 0) {
      logger.debug(`[resetRuleUsageData] No rules found for user, exiting early`);
      return;
    }

    // Update all rules with usage_data: [0,0,0,0,0,0,0] (7-element array for Mon-Sun)
    const { error: updateError } = await supabase
      .from('rules')
      .update({ usage_data: [0, 0, 0, 0, 0, 0, 0] })
      .eq('user_id', userId);

    if (updateError) {
      logger.error(`[resetRuleUsageData] Error resetting rule usage data:`, updateError);
      throw updateError;
    }

    // Sync updated rules to IndexedDB
    const existingRules = await loadRulesFromDB();
    if (existingRules && Array.isArray(existingRules)) {
      // Update the existing rules with reset usage_data
      const updatedRules = existingRules.map(rule => {
        if (rule.user_id === userId) {
          return { ...rule, usage_data: [0, 0, 0, 0, 0, 0, 0] };
        }
        return rule;
      });
      
      await saveRulesToDB(updatedRules);
      logger.debug(`[resetRuleUsageData] Synced updated rules to IndexedDB`);
    }

    logger.debug(`[resetRuleUsageData] Successfully reset rule usage data`);
  } catch (error) {
    logger.error(`[resetRuleUsageData] Failed to reset rule usage data:`, getErrorMessage(error));
    throw error;
  }
};

/**
 * Check if rule resets are needed and perform them
 * @returns boolean indicating whether any reset was performed
 */
export const checkAndPerformRuleResets = async (): Promise<boolean> => {
  try {
    const currentWeekly = currentWeekKey();
    const lastWeekly = localStorage.getItem('lastWeek');

    let resetPerformed = false;

    // Check for weekly reset only (rules reset weekly)
    if (lastWeekly !== currentWeekly) {
      logger.debug('[checkAndPerformRuleResets] Performing weekly rule reset');
      await resetRuleUsageData();
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
