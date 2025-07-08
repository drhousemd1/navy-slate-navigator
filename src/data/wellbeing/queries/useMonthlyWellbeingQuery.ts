import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { logger } from '@/lib/logger';
import { useUserIds } from '@/contexts/UserIdsContext';

export interface MonthlyWellbeingDataItem {
  date: string;
  subScore: number | null;
  domScore: number | null;
  subHasData: boolean;
  domHasData: boolean;
}

export const MONTHLY_WELLBEING_QUERY_KEY = ['monthly-wellbeing'];

const fetchMonthlyWellbeingData = async (subUserId: string, domUserId: string): Promise<MonthlyWellbeingDataItem[]> => {
  logger.debug('Fetching monthly wellbeing data for users:', subUserId, domUserId);
  
  try {
    const today = new Date();
    const start = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    
    // Only generate days up to today, don't include future days
    const end = today < monthEnd ? today : monthEnd;
    end.setHours(23, 59, 59, 999);

    // Generate days for the month up to today only
    const monthDays = eachDayOfInterval({ start, end });
    const monthData: MonthlyWellbeingDataItem[] = monthDays.map(date => ({
      date: format(date, 'yyyy-MM-dd'),
      subScore: null,
      domScore: null,
      subHasData: false,
      domHasData: false
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

    // Map wellbeing data to corresponding days, separating by user
    if (wellbeingData) {
      wellbeingData.forEach(entry => {
        const entryDate = format(new Date(entry.updated_at), 'yyyy-MM-dd');
        const dayIndex = monthData.findIndex(day => day.date === entryDate);
        if (dayIndex !== -1) {
          if (entry.user_id === subUserId) {
            monthData[dayIndex].subScore = entry.overall_score;
            monthData[dayIndex].subHasData = true;
          } else if (entry.user_id === domUserId) {
            monthData[dayIndex].domScore = entry.overall_score;
            monthData[dayIndex].domHasData = true;
          }
        }
      });
    }

    // Implement carry-forward logic for continuous chart lines
    let lastSubScore: number | null = null;
    let lastDomScore: number | null = null;

    // Look for most recent data before the month if first day has no data
    if ((!monthData[0].subHasData || !monthData[0].domHasData) && wellbeingData) {
      const preMonthData = wellbeingData.filter(entry => 
        new Date(entry.updated_at) < start
      ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      
      if (!monthData[0].subHasData) {
        const lastSubEntry = preMonthData.find(entry => entry.user_id === subUserId);
        if (lastSubEntry) lastSubScore = lastSubEntry.overall_score;
      }
      
      if (!monthData[0].domHasData) {
        const lastDomEntry = preMonthData.find(entry => entry.user_id === domUserId);
        if (lastDomEntry) lastDomScore = lastDomEntry.overall_score;
      }
    }

    // Apply carry-forward logic day by day
    monthData.forEach((day, index) => {
      // Update last known scores when we have actual data
      if (day.subHasData && day.subScore !== null) {
        lastSubScore = day.subScore;
      }
      if (day.domHasData && day.domScore !== null) {
        lastDomScore = day.domScore;
      }

      // Carry forward previous scores when no data exists
      if (!day.subHasData && lastSubScore !== null) {
        day.subScore = lastSubScore;
      }
      if (!day.domHasData && lastDomScore !== null) {
        day.domScore = lastDomScore;
      }

      // Use default score if no prior data exists
      if (day.subScore === null) {
        day.subScore = 50; // Default wellness score
      }
      if (day.domScore === null) {
        day.domScore = 50; // Default wellness score
      }
    });

    logger.debug('Monthly wellbeing data prepared with carry-forward:', monthData);
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