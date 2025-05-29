
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { startOfWeek, endOfWeek } from 'date-fns';
import { logger } from '@/lib/logger';

export const fetchCurrentWeekPunishmentHistory = async (subUserId: string | null, domUserId: string | null): Promise<PunishmentHistoryItem[]> => {
  if (!subUserId && !domUserId) {
    logger.debug("[fetchCurrentWeekPunishmentHistory] No user IDs provided, returning empty array");
    return [];
  }

  const now = new Date();
  // Assuming week starts on Monday for consistency with `convertToMondayBasedIndex`
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Build user filter - include both sub and dom user IDs for partner sharing
  const userIds = [subUserId, domUserId].filter(Boolean);
  
  if (userIds.length === 0) {
    logger.warn('[fetchCurrentWeekPunishmentHistory] No valid user IDs for filtering');
    return [];
  }

  const { data, error } = await supabase
    .from('punishment_history')
    .select('*')
    .in('user_id', userIds)
    .gte('applied_date', weekStart.toISOString())
    .lte('applied_date', weekEnd.toISOString())
    .order('applied_date', { ascending: false });
  
  if (error) {
    logger.error('Error fetching punishment history:', error);
    throw error;
  }
  return data || [];
};
