
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { loadRulesFromDB, saveRulesToDB } from '@/data/indexedDB/useIndexedDB';
import { Rule } from '@/data/interfaces/Rule';

/**
 * Reset rule usage data for rules with specified frequency
 * @param frequency - 'daily' or 'weekly'
 */
export const resetRuleUsageData = async (frequency: 'daily' | 'weekly'): Promise<void> => {
  try {
    logger.debug(`[resetRuleUsageData] Resetting ${frequency} rule usage data`);

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.user) {
      logger.debug('[resetRuleUsageData] No authenticated user, skipping reset');
      return;
    }

    const { data: rules, error } = await supabase
      .from('rules')
      .select('*')
      .eq('frequency', frequency)
      .eq('user_id', session.user.id);

    if (error) {
      logger.error(`[resetRuleUsageData] Error fetching ${frequency} rules:`, error);
      return;
    }

    if (!rules || rules.length === 0) {
      logger.debug(`[resetRuleUsageData] No ${frequency} rules found to reset`);
      return;
    }

    const { data: updatedRules, error: updateError } = await supabase
      .from('rules')
      .update({ usage_data: [] })
      .in('id', rules.map(rule => rule.id))
      .eq('user_id', session.user.id)
      .select('*');

    if (updateError) {
      logger.error(`[resetRuleUsageData] Error resetting ${frequency} rules:`, updateError);
      throw updateError;
    }

    logger.debug(`[resetRuleUsageData] Successfully reset ${updatedRules?.length ?? 0} ${frequency} rules`);

    if (updatedRules) {
      const currentLocalRules = (await loadRulesFromDB()) || [];
      const updatedLocalRules = currentLocalRules.map(localRule => {
        const resetRule = updatedRules.find(ur => ur.id === localRule.id);
        return resetRule ? (resetRule as Rule) : localRule;
      });
      await saveRulesToDB(updatedLocalRules);
      logger.debug('[resetRuleUsageData] Synced reset rules to IndexedDB');
    }
  } catch (error) {
    logger.error(`[resetRuleUsageData] Failed to reset ${frequency} rule usage data:`, getErrorMessage(error));
    throw error;
  }
};

/**
 * Check if rule resets are needed and perform them
 */
export const checkAndPerformRuleResets = async (): Promise<boolean> => {
  let resetPerformed = false;
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
