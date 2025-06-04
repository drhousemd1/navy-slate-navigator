
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

export async function resetRewardsUsageData(userId: string): Promise<void> {
  try {
    logger.debug('[resetRewardsUsageData] Starting reset for user:', userId);
    
    // Delete all reward usage records for the current week
    const currentWeek = currentWeekKey();
    const { error } = await supabase
      .from('reward_usage')
      .delete()
      .eq('user_id', userId)
      .eq('week_number', currentWeek);

    if (error) {
      logger.error('[resetRewardsUsageData] Error resetting rewards usage data:', error);
      throw error;
    }

    logger.debug('[resetRewardsUsageData] Successfully reset rewards usage data');
  } catch (error) {
    logger.error('[resetRewardsUsageData] Failed to reset rewards usage data:', error);
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
