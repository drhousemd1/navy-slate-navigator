
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';
import { saveRulesToDB, loadRulesFromDB } from '../data/indexedDB/useIndexedDB';
import { currentWeekKey } from './taskUtils';

/**
 * Enhanced reset function that clears ALL rules usage data for the current week
 */
export const resetRulesUsageData = async () => {
  try {
    logger.debug('[resetRulesUsageData] Starting weekly rules reset for ALL rules');
    
    // Get current user session to ensure proper filtering
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      logger.debug('[resetRulesUsageData] No authenticated user, skipping reset');
      return;
    }

    // Get ALL rules for the user
    const { data: rules, error } = await supabase
      .from('rules')
      .select('*')
      .eq('user_id', session.user.id);

    if (error) {
      logger.error('[resetRulesUsageData] Error fetching rules:', error);
      return;
    }

    if (!rules || rules.length === 0) {
      logger.debug('[resetRulesUsageData] No rules found to reset');
      return;
    }

    logger.debug(`[resetRulesUsageData] Found ${rules.length} rules to reset`);

    // Reset ALL rules - clear usage_data
    const { data: updatedRules, error: updateError } = await supabase
      .from('rules')
      .update({ 
        usage_data: [] // Clear the usage tracking data
      })
      .in('id', rules.map(rule => rule.id))
      .eq('user_id', session.user.id)
      .select('*');

    if (updateError) {
      logger.error('[resetRulesUsageData] Error resetting rules:', updateError);
      throw updateError;
    }

    logger.debug(`[resetRulesUsageData] Successfully reset ${rules.length} rules`);

    // CRITICAL: Immediately sync the updated data to IndexedDB
    if (updatedRules) {
      logger.debug(`[resetRulesUsageData] Syncing ${updatedRules.length} updated rules to IndexedDB`);
      
      // Load current rules from IndexedDB
      const currentLocalRules = await loadRulesFromDB() || [];
      
      // Update the local rules with the reset rules
      const updatedLocalRules = currentLocalRules.map(localRule => {
        const resetRule = updatedRules.find(ur => ur.id === localRule.id);
        return resetRule ? resetRule : localRule;
      });
      
      // Save back to IndexedDB
      await saveRulesToDB(updatedLocalRules);
      logger.debug('[resetRulesUsageData] Successfully synced reset data to IndexedDB');
    }
    
  } catch (error) {
    logger.error('[resetRulesUsageData] Exception during weekly reset:', error);
    throw error;
  }
};

/**
 * Check and perform rules resets if needed
 */
export const checkAndPerformRulesResets = async (): Promise<boolean> => {
  let resetPerformed = false;
  
  try {
    // Check weekly reset
    const lastRulesWeek = localStorage.getItem("lastRulesWeek");
    const currentWeekly = currentWeekKey();
    
    if (lastRulesWeek !== currentWeekly) {
      logger.debug(`[checkAndPerformRulesResets] Performing weekly reset: ${lastRulesWeek} -> ${currentWeekly}`);
      await resetRulesUsageData();
      localStorage.setItem("lastRulesWeek", currentWeekly);
      resetPerformed = true;
    }
    
    return resetPerformed;
  } catch (error) {
    logger.error('[checkAndPerformRulesResets] Error during reset check:', error);
    return false;
  }
};
