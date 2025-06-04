
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

export async function resetPunishmentsUsageData(userId: string): Promise<void> {
  try {
    logger.debug('[resetPunishmentsUsageData] Starting reset for user:', userId);
    
    // Delete all punishment history records for the current week
    const currentWeek = currentWeekKey();
    const { error } = await supabase
      .from('punishment_history')
      .delete()
      .eq('user_id', userId)
      .gte('applied_date', new Date(currentWeek).toISOString());

    if (error) {
      logger.error('[resetPunishmentsUsageData] Error resetting punishments usage data:', error);
      throw error;
    }

    logger.debug('[resetPunishmentsUsageData] Successfully reset punishments usage data');
  } catch (error) {
    logger.error('[resetPunishmentsUsageData] Failed to reset punishments usage data:', error);
    throw error;
  }
}

export function currentWeekKey(): string {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek.toISOString();
}
