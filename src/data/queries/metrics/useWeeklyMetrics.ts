
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { generateMondayBasedWeekDates } from '@/lib/utils';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';
import { useUserIds } from '@/contexts/UserIdsContext';

export interface WeeklyDataItem {
  date: string;
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

export const WEEKLY_METRICS_QUERY_KEY = ['weekly-metrics'];

const fetchWeeklyData = async (subUserId: string, domUserId: string): Promise<WeeklyDataItem[]> => {
  logger.debug('Fetching weekly chart data via useWeeklyMetrics hook at', new Date().toISOString(), 'for users:', subUserId, domUserId);
  try {
    const weekDays = generateMondayBasedWeekDates();
    const metricsMap = new Map<string, WeeklyDataItem>();
    weekDays.forEach(date => {
      metricsMap.set(date, {
        date,
        tasksCompleted: 0,
        rulesBroken: 0,
        rewardsRedeemed: 0,
        punishments: 0
      });
    });

    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const end = endOfWeek(today, { weekStartsOn: 1 });

    // Fetch task completions
    const { data: taskCompletions, error: taskError } = await supabase
      .from('task_completion_history')
      .select('task_id, completed_at')
      .in('user_id', [subUserId, domUserId])
      .gte('completed_at', start.toISOString())
      .lte('completed_at', end.toISOString());

    if (taskError) logger.error('Error fetching task completions:', taskError);
    else if (taskCompletions) {
      const completionsByDate = new Map<string, Set<string>>();
      taskCompletions.forEach(entry => {
        const date = format(new Date(entry.completed_at), 'yyyy-MM-dd');
        if (!completionsByDate.has(date)) completionsByDate.set(date, new Set());
        completionsByDate.get(date)?.add(entry.task_id);
      });
      completionsByDate.forEach((taskIds, date) => {
        if (metricsMap.has(date)) metricsMap.get(date)!.tasksCompleted = taskIds.size;
      });
    }

    // Fetch rule violations
    const { data: ruleViolations, error: ruleError } = await supabase
      .from('rule_violations')
      .select('violation_date')
      .in('user_id', [subUserId, domUserId])
      .gte('violation_date', start.toISOString())
      .lte('violation_date', end.toISOString());

    if (ruleError) logger.error('Error fetching rule violations:', ruleError);
    else if (ruleViolations) {
      ruleViolations.forEach(entry => {
        const date = format(new Date(entry.violation_date), 'yyyy-MM-dd');
        if (metricsMap.has(date)) metricsMap.get(date)!.rulesBroken++;
      });
    }

    // Fetch reward usages
    const { data: rewardUsages, error: rewardError } = await supabase
      .from('reward_usage')
      .select('created_at')
      .in('user_id', [subUserId, domUserId])
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (rewardError) logger.error('Error fetching reward usages:', rewardError);
    else if (rewardUsages) {
      rewardUsages.forEach(entry => {
        const date = format(new Date(entry.created_at), 'yyyy-MM-dd');
        if (metricsMap.has(date)) metricsMap.get(date)!.rewardsRedeemed++;
      });
    }

    // Fetch punishments
    const { data: punishmentsData, error: punishmentError } = await supabase
      .from('punishment_history')
      .select('applied_date')
      .in('user_id', [subUserId, domUserId])
      .gte('applied_date', start.toISOString())
      .lte('applied_date', end.toISOString());

    if (punishmentError) logger.error('Error fetching punishments:', punishmentError);
    else if (punishmentsData) {
      punishmentsData.forEach(entry => {
        const date = format(new Date(entry.applied_date), 'yyyy-MM-dd');
        if (metricsMap.has(date)) metricsMap.get(date)!.punishments++;
      });
    }

    const result = Array.from(metricsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    logger.debug('Weekly chart data prepared via hook:', result);
    return result;
  } catch (error: unknown) {
    logger.error('Error fetching weekly data in hook:', error);
    toast({
      title: 'Error Fetching Weekly Data',
      description: getErrorMessage(error),
      variant: 'destructive'
    });
    return [];
  }
};

interface UseWeeklyMetricsOptions {
  enabled?: boolean;
}

export const useWeeklyMetrics = (options?: UseWeeklyMetricsOptions) => {
  const { subUserId, domUserId, isLoadingUserIds } = useUserIds();
  
  const isEnabled = !isLoadingUserIds && !!subUserId && !!domUserId && (options?.enabled ?? false);
  
  logger.debug('[useWeeklyMetrics] Query enabled check:', {
    isLoadingUserIds,
    subUserId,
    domUserId,
    optionsEnabled: options?.enabled,
    finalEnabled: isEnabled
  });
  
  return useQuery<WeeklyDataItem[], Error>({
    queryKey: [...WEEKLY_METRICS_QUERY_KEY, subUserId, domUserId],
    queryFn: () => fetchWeeklyData(subUserId!, domUserId!),
    enabled: isEnabled,
    ...STANDARD_QUERY_CONFIG,
  });
};
