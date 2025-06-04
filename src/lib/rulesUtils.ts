
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

/**
 * Reset rule usage data for rules with specified frequency
 * @param frequency - 'daily' or 'weekly'
 */
export const resetRuleUsageData = async (frequency: 'daily' | 'weekly'): Promise<void> => {
  try {
    logger.debug(`[resetRuleUsageData] Resetting ${frequency} rule usage data`);
    
    const { error } = await supabase
      .from('rules')
      .update({ usage_data: [] })
      .eq('frequency', frequency);

    if (error) {
      logger.error(`[resetRuleUsageData] Error resetting ${frequency} rule usage data:`, error);
      throw error;
    }

    logger.debug(`[resetRuleUsageData] Successfully reset ${frequency} rule usage data`);
  } catch (error) {
    logger.error(`[resetRuleUsageData] Failed to reset ${frequency} rule usage data:`, getErrorMessage(error));
    throw error;
  }
};

/**
 * Check if rule resets are needed and perform them
 */
export const checkAndPerformRuleResets = async (): Promise<void> => {
  try {
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentDay = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const lastDailyReset = localStorage.getItem('lastDailyRuleReset');
    const lastWeeklyReset = localStorage.getItem('lastWeeklyRuleReset');

    // Check for daily reset
    if (lastDailyReset !== currentDay) {
      logger.debug('[checkAndPerformRuleResets] Performing daily rule reset');
      await resetRuleUsageData('daily');
      localStorage.setItem('lastDailyRuleReset', currentDay);
    }

    // Check for weekly reset (reset on Monday)
    if (lastWeeklyReset !== currentWeek.toString()) {
      logger.debug('[checkAndPerformRuleResets] Performing weekly rule reset');
      await resetRuleUsageData('weekly');
      localStorage.setItem('lastWeeklyRuleReset', currentWeek.toString());
    }
  } catch (error) {
    logger.error('[checkAndPerformRuleResets] Error during rule resets:', getErrorMessage(error));
    // Don't throw - we don't want to break the app if reset fails
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
