import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { logger } from '@/lib/logger';
import { useUserIds } from '@/contexts/UserIdsContext';

export interface MonthlyWellbeingDataItem {
  date: string;
  overall_score: number | null;
  hasData: boolean;
}

export const MONTHLY_WELLBEING_QUERY_KEY = ['monthly-wellbeing'];

const fetchMonthlyWellbeingData = async (subUserId: string, domUserId: string): Promise<MonthlyWellbeingDataItem[]> => {
  logger.debug('Fetching monthly wellbeing data for users:', subUserId, domUserId);
  
  try {
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    end.setHours(23, 59, 59, 999);

    // Generate all days for the month
    const monthDays = eachDayOfInterval({ start, end });
    const monthData: MonthlyWellbeingDataItem[] = monthDays.map(date => ({
      date: format(date, 'yyyy-MM-dd'),
      overall_score: null,
      hasData: false
    }));

    // Fetch wellbeing snapshots for the month
    const { data: wellbeingData, error } = await supabase
      .from('wellbeing_snapshots')
      .select('user_id, overall_score, updated_at')
      .in('user_id', [subUserId, domUserId])
      .gte('updated_at', start.toISOString())
      .lte('updated_at', end.toISOString())
      .order('updated_at', { ascending: true });

    if (error) {
      logger.error('Error fetching monthly wellbeing data:', error);
      return monthData;
    }

    // Map wellbeing data to corresponding days (use latest score for each day)
    if (wellbeingData) {
      wellbeingData.forEach(entry => {
        const entryDate = format(new Date(entry.updated_at), 'yyyy-MM-dd');
        const dayIndex = monthData.findIndex(day => day.date === entryDate);
        if (dayIndex !== -1) {
          monthData[dayIndex] = {
            date: entryDate,
            overall_score: entry.overall_score,
            hasData: true
          };
        }
      });
    }

    logger.debug('Monthly wellbeing data prepared:', monthData);
    return monthData;
  } catch (err) {
    logger.error('Error in fetchMonthlyWellbeingData:', err);
    return [];
  }
};

interface UseMonthlyWellbeingOptions {
  enabled?: boolean;
}

export const useMonthlyWellbeingQuery = (options?: UseMonthlyWellbeingOptions) => {
  const { subUserId, domUserId, isLoadingUserIds } = useUserIds();
  
  const isEnabled = !isLoadingUserIds && !!subUserId && !!domUserId && (options?.enabled ?? true);
  
  return useQuery<MonthlyWellbeingDataItem[], Error>({
    queryKey: [...MONTHLY_WELLBEING_QUERY_KEY, subUserId, domUserId],
    queryFn: () => fetchMonthlyWellbeingData(subUserId!, domUserId!),
    enabled: isEnabled,
    ...STANDARD_QUERY_CONFIG,
  });
};