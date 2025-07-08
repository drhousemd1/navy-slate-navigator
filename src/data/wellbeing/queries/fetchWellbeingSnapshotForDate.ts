import { supabase } from '@/integrations/supabase/client';
import { WellbeingSnapshot } from '../types';
import { logger } from '@/lib/logger';

export const fetchWellbeingSnapshotForDate = async (userId: string, date: string): Promise<WellbeingSnapshot | null> => {
  try {
    logger.debug('[fetchWellbeingSnapshotForDate] Fetching wellbeing snapshot for user:', userId, 'date:', date);
    
    // Parse the input date and create a proper date range
    // Input date is typically in format: "2025-07-08"
    const inputDate = new Date(date + 'T00:00:00.000Z'); // Force UTC interpretation
    
    // Create date range for the selected day in UTC
    const startOfDay = new Date(inputDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const endOfDay = new Date(inputDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    logger.debug('[fetchWellbeingSnapshotForDate] Date range:', {
      inputDate: date,
      parsedDate: inputDate.toISOString(),
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString()
    });

    // Try to get data for the specific day first
    let { data, error } = await supabase
      .from('wellbeing_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('updated_at', startOfDay.toISOString())
      .lte('updated_at', endOfDay.toISOString())
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    logger.debug('[fetchWellbeingSnapshotForDate] Primary query result:', { 
      data, 
      error, 
      queryParams: { 
        userId, 
        dateRange: `${startOfDay.toISOString()} to ${endOfDay.toISOString()}` 
      } 
    });

    // If no data found for the specific day, try a broader search for recent data
    if (!data && !error) {
      logger.debug('[fetchWellbeingSnapshotForDate] No data found for specific day, searching for recent data...');
      
      const fallbackResult = await supabase
        .from('wellbeing_snapshots')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      logger.debug('[fetchWellbeingSnapshotForDate] Fallback query result:', fallbackResult);
      
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

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