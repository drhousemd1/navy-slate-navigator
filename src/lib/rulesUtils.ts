
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

export async function resetRulesUsageData(userId: string): Promise<void> {
  try {
    logger.debug('[resetRulesUsageData] Starting reset for user:', userId);
    
    // Reset usage_data to empty array for all rules belonging to the user
    const { error } = await supabase
      .from('rules')
      .update({ usage_data: [] })
      .eq('user_id', userId);

    if (error) {
      logger.error('[resetRulesUsageData] Error resetting rules usage data:', error);
      throw error;
    }

    logger.debug('[resetRulesUsageData] Successfully reset rules usage data');
  } catch (error) {
    logger.error('[resetRulesUsageData] Failed to reset rules usage data:', error);
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
