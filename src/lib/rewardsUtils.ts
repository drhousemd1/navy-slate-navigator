
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';
import { saveRewardsToDB, loadRewardsFromDB } from '../data/indexedDB/useIndexedDB';
import { currentWeekKey } from './taskUtils';

/**
 * Enhanced reset function that clears ALL reward usage data for the current week
 */
export const resetRewardsUsageData = async () => {
  try {
    logger.debug('[resetRewardsUsageData] Starting weekly rewards reset');
    
    // Get current user session to ensure proper filtering
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      logger.debug('[resetRewardsUsageData] No authenticated user, skipping reset');
      return;
    }

    const currentWeek = currentWeekKey();
    
    // Delete all reward usage records for current week
    const { error: deleteError } = await supabase
      .from('reward_usage')
      .delete()
      .eq('user_id', session.user.id)
      .eq('week_number', currentWeek);

    if (deleteError) {
      logger.error('[resetRewardsUsageData] Error deleting reward usage:', deleteError);
      throw deleteError;
    }

    logger.debug('[resetRewardsUsageData] Successfully cleared reward usage data for current week');

    // Force refresh of IndexedDB cache by clearing and reloading
    const { data: freshRewards, error: fetchError } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', session.user.id);

    if (fetchError) {
      logger.error('[resetRewardsUsageData] Error fetching fresh rewards:', fetchError);
      throw fetchError;
    }

    if (freshRewards) {
      await saveRewardsToDB(freshRewards);
      logger.debug('[resetRewardsUsageData] Successfully synced fresh rewards to IndexedDB');
    }
    
  } catch (error) {
    logger.error('[resetRewardsUsageData] Exception during weekly reset:', error);
    throw error;
  }
};

/**
 * Check and perform rewards resets if needed
 */
export const checkAndPerformRewardsResets = async (): Promise<boolean> => {
  let resetPerformed = false;
  
  try {
    // Check weekly reset
    const lastRewardsWeek = localStorage.getItem("lastRewardsWeek");
    const currentWeekly = currentWeekKey();
    
    if (lastRewardsWeek !== currentWeekly) {
      logger.debug(`[checkAndPerformRewardsResets] Performing weekly reset: ${lastRewardsWeek} -> ${currentWeekly}`);
      await resetRewardsUsageData();
      localStorage.setItem("lastRewardsWeek", currentWeekly);
      resetPerformed = true;
    }
    
    return resetPerformed;
  } catch (error) {
    logger.error('[checkAndPerformRewardsResets] Error during reset check:', error);
    return false;
  }
};
