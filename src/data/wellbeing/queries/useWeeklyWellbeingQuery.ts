import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { logger } from '@/lib/logger';
import { useUserIds } from '@/contexts/UserIdsContext';

export interface WeeklyWellbeingDataItem {
  date: string;
  subScore: number | null;
  domScore: number | null;
  subHasData: boolean;
  domHasData: boolean;
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
      subScore: null,
      domScore: null,
      subHasData: false,
      domHasData: false
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

    // Map wellbeing data to corresponding days, separating by user
    if (wellbeingData) {
      wellbeingData.forEach(entry => {
        const entryDate = format(new Date(entry.updated_at), 'yyyy-MM-dd');
        const dayIndex = weekData.findIndex(day => day.date === entryDate);
        if (dayIndex !== -1) {
          if (entry.user_id === subUserId) {
            weekData[dayIndex].subScore = entry.overall_score;
            weekData[dayIndex].subHasData = true;
          } else if (entry.user_id === domUserId) {
            weekData[dayIndex].domScore = entry.overall_score;
            weekData[dayIndex].domHasData = true;
          }
        }
      });
    }

    // Implement carry-forward logic for continuous chart lines
    let lastSubScore: number | null = null;
    let lastDomScore: number | null = null;

    // Look for most recent data before the week if first day has no data
    if ((!weekData[0].subHasData || !weekData[0].domHasData) && wellbeingData) {
      const preWeekData = wellbeingData.filter(entry => 
        new Date(entry.updated_at) < start
      ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      
      if (!weekData[0].subHasData) {
        const lastSubEntry = preWeekData.find(entry => entry.user_id === subUserId);
        if (lastSubEntry) lastSubScore = lastSubEntry.overall_score;
      }
      
      if (!weekData[0].domHasData) {
        const lastDomEntry = preWeekData.find(entry => entry.user_id === domUserId);
        if (lastDomEntry) lastDomScore = lastDomEntry.overall_score;
      }
    }

    // Apply carry-forward logic day by day
    weekData.forEach((day, index) => {
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

    logger.debug('Weekly wellbeing data prepared with carry-forward:', weekData);
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