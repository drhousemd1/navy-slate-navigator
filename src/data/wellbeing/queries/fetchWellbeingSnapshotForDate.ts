import { supabase } from '@/integrations/supabase/client';
import { WellbeingSnapshot } from '../types';
import { logger } from '@/lib/logger';

export const fetchWellbeingSnapshotForDate = async (userId: string, date: string): Promise<WellbeingSnapshot | null> => {
  try {
    logger.debug('[fetchWellbeingSnapshotForDate] Fetching wellbeing snapshot for user:', userId, 'date:', date);
    
    // Create date range for the selected day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    logger.debug('[fetchWellbeingSnapshotForDate] Date range:', {
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString()
    });

    const { data, error } = await supabase
      .from('wellbeing_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('updated_at', startOfDay.toISOString())
      .lte('updated_at', endOfDay.toISOString())
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    logger.debug('[fetchWellbeingSnapshotForDate] Query result:', { data, error, queryParams: { userId, startOfDay: startOfDay.toISOString(), endOfDay: endOfDay.toISOString() } });

    if (error) {
      logger.error('[fetchWellbeingSnapshotForDate] Error fetching wellbeing snapshot:', error);
      throw error;
    }

    if (!data) {
      logger.debug('[fetchWellbeingSnapshotForDate] No wellbeing snapshot found for date');
      return null;
    }

    // Cast the database response to our type
    const wellbeingSnapshot: WellbeingSnapshot = {
      ...data,
      metrics: data.metrics as Record<string, number>
    };

    logger.debug('[fetchWellbeingSnapshotForDate] Successfully fetched wellbeing snapshot:', wellbeingSnapshot);
    return wellbeingSnapshot;
  } catch (error) {
    logger.error('[fetchWellbeingSnapshotForDate] Failed to fetch wellbeing snapshot:', error);
    throw error;
  }
};