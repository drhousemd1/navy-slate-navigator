
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { loadRulesFromDB, saveRulesToDB } from '@/data/indexedDB/useIndexedDB';

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
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentDay = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const lastDailyReset = localStorage.getItem('lastDailyRuleReset');
    const lastWeeklyReset = localStorage.getItem('lastWeeklyRuleReset');

    let resetPerformed = false;

    // Check for daily reset
    if (lastDailyReset !== currentDay) {
      logger.debug('[checkAndPerformRuleResets] Performing daily rule reset');
      await resetRuleUsageData('daily');
      localStorage.setItem('lastDailyRuleReset', currentDay);
      resetPerformed = true;
    }

    // Check for weekly reset (reset on Monday)
    if (lastWeeklyReset !== currentWeek.toString()) {
      logger.debug('[checkAndPerformRuleResets] Performing weekly rule reset');
      await resetRuleUsageData('weekly');
      localStorage.setItem('lastWeeklyRuleReset', currentWeek.toString());
      resetPerformed = true;
    }

    return resetPerformed;
  } catch (error) {
    logger.error('[checkAndPerformRuleResets] Error during rule resets:', getErrorMessage(error));
    // Don't throw - we don't want to break the app if reset fails
    return false;
  }
};

/**
 * Get ISO week number for a given date
 */
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};
