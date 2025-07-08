import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { logger } from '@/lib/logger';
import { useUserIds } from '@/contexts/UserIdsContext';

export interface WeeklyWellbeingDataItem {
  date: string;
  overall_score: number | null;
  hasData: boolean;
}

export const WEEKLY_WELLBEING_QUERY_KEY = ['weekly-wellbeing'];

const fetchWeeklyWellbeingData = async (subUserId: string, domUserId: string): Promise<WeeklyWellbeingDataItem[]> => {
  logger.debug('Fetching weekly wellbeing data for users:', subUserId, domUserId);
  
  try {
    // Calculate current week (Monday to Sunday)
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setHours(23, 59, 59, 999);

    // Generate all days for the week
    const weekDays = eachDayOfInterval({ start, end: new Date(end.getTime() - 1) });
    const weekData: WeeklyWellbeingDataItem[] = weekDays.map(date => ({
      date: format(date, 'yyyy-MM-dd'),
      overall_score: null,
      hasData: false
    }));

    // Fetch wellbeing snapshots for the week
    const { data: wellbeingData, error } = await supabase
      .from('wellbeing_snapshots')
      .select('user_id, overall_score, updated_at')
      .in('user_id', [subUserId, domUserId])
      .gte('updated_at', start.toISOString())
      .lte('updated_at', end.toISOString())
      .order('updated_at', { ascending: true });

    if (error) {
      logger.error('Error fetching wellbeing data:', error);
      return weekData;
    }

    // Map wellbeing data to corresponding days (use latest score for each day)
    if (wellbeingData) {
      wellbeingData.forEach(entry => {
        const entryDate = format(new Date(entry.updated_at), 'yyyy-MM-dd');
        const dayIndex = weekData.findIndex(day => day.date === entryDate);
        if (dayIndex !== -1) {
          weekData[dayIndex] = {
            date: entryDate,
            overall_score: entry.overall_score,
            hasData: true
          };
        }
      });
    }

    logger.debug('Weekly wellbeing data prepared:', weekData);
    return weekData;
  } catch (err) {
    logger.error('Error in fetchWeeklyWellbeingData:', err);
    return [];
  }
};

interface UseWeeklyWellbeingOptions {
  enabled?: boolean;
}

export const useWeeklyWellbeingQuery = (options?: UseWeeklyWellbeingOptions) => {
  const { subUserId, domUserId, isLoadingUserIds } = useUserIds();
  
  const isEnabled = !isLoadingUserIds && !!subUserId && !!domUserId && (options?.enabled ?? true);
  
  return useQuery<WeeklyWellbeingDataItem[], Error>({
    queryKey: [...WEEKLY_WELLBEING_QUERY_KEY, subUserId, domUserId],
    queryFn: () => fetchWeeklyWellbeingData(subUserId!, domUserId!),
    enabled: isEnabled,
    ...STANDARD_QUERY_CONFIG,
  });
};