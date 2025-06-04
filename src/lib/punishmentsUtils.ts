
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';
import { savePunishmentsToDB, loadPunishmentsFromDB } from '../data/indexedDB/useIndexedDB';
import { currentWeekKey } from './taskUtils';

/**
 * Enhanced reset function that clears ALL punishment history data for the current week
 */
export const resetPunishmentsUsageData = async () => {
  try {
    logger.debug('[resetPunishmentsUsageData] Starting weekly punishments reset');
    
    // Get current user session to ensure proper filtering
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      logger.debug('[resetPunishmentsUsageData] No authenticated user, skipping reset');
      return;
    }

    const currentWeek = currentWeekKey();
    
    // Delete all punishment history records for current week
    // We need to check if there's a week-based filter or use date-based filtering
    const weekStart = new Date();
    const currentDay = weekStart.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Calculate Monday of current week
    weekStart.setDate(weekStart.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { error: deleteError } = await supabase
      .from('punishment_history')
      .delete()
      .eq('user_id', session.user.id)
      .gte('applied_date', weekStart.toISOString())
      .lt('applied_date', weekEnd.toISOString());

    if (deleteError) {
      logger.error('[resetPunishmentsUsageData] Error deleting punishment history:', deleteError);
      throw deleteError;
    }

    logger.debug('[resetPunishmentsUsageData] Successfully cleared punishment history data for current week');

    // Force refresh of IndexedDB cache by clearing and reloading
    const { data: freshPunishments, error: fetchError } = await supabase
      .from('punishments')
      .select('*')
      .eq('user_id', session.user.id);

    if (fetchError) {
      logger.error('[resetPunishmentsUsageData] Error fetching fresh punishments:', fetchError);
      throw fetchError;
    }

    if (freshPunishments) {
      await savePunishmentsToDB(freshPunishments);
      logger.debug('[resetPunishmentsUsageData] Successfully synced fresh punishments to IndexedDB');
    }
    
  } catch (error) {
    logger.error('[resetPunishmentsUsageData] Exception during weekly reset:', error);
    throw error;
  }
};

/**
 * Check and perform punishments resets if needed
 */
export const checkAndPerformPunishmentsResets = async (): Promise<boolean> => {
  let resetPerformed = false;
  
  try {
    // Check weekly reset
    const lastPunishmentsWeek = localStorage.getItem("lastPunishmentsWeek");
    const currentWeekly = currentWeekKey();
    
    if (lastPunishmentsWeek !== currentWeekly) {
      logger.debug(`[checkAndPerformPunishmentsResets] Performing weekly reset: ${lastPunishmentsWeek} -> ${currentWeekly}`);
      await resetPunishmentsUsageData();
      localStorage.setItem("lastPunishmentsWeek", currentWeekly);
      resetPerformed = true;
    }
    
    return resetPerformed;
  } catch (error) {
    logger.error('[checkAndPerformPunishmentsResets] Error during reset check:', error);
    return false;
  }
};
