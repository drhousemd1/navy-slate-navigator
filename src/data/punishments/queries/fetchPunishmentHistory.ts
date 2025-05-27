
import { supabase } from '@/integrations/supabase/client';
import { PunishmentHistoryItem } from '@/contexts/punishments/types';
import { startOfWeek, endOfWeek } from 'date-fns';
import { logger } from '@/lib/logger'; // Added logger import

export const fetchCurrentWeekPunishmentHistory = async (): Promise<PunishmentHistoryItem[]> => {
  const now = new Date();
  // Assuming week starts on Monday for consistency with `convertToMondayBasedIndex`
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const { data, error } = await supabase
    .from('punishment_history')
    .select('*')
    .gte('applied_date', weekStart.toISOString())
    .lte('applied_date', weekEnd.toISOString())
    .order('applied_date', { ascending: false });
  
  if (error) {
    logger.error('Error fetching punishment history:', error); // Replaced console.error
    throw error;
  }
  return data || [];
};

