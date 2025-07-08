
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { logger } from '@/lib/logger';
import { useUserIds } from '@/contexts/UserIdsContext';

export interface MonthlyDataItem {
  date: string;
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

export interface MonthlyMetricsSummary {
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

export interface MonthlyMetricsData {
  dataArray: MonthlyDataItem[];
  monthlyTotals: MonthlyMetricsSummary;
}

export const MONTHLY_METRICS_QUERY_KEY = ['monthly-metrics'];

const generateMonthDays = (): string[] => {
  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  return eachDayOfInterval({ start, end }).map(date => format(date, 'yyyy-MM-dd'));
};

const fetchMonthlyData = async (subUserId: string, domUserId: string): Promise<MonthlyMetricsData> => {
  logger.debug('Fetching monthly chart data via useMonthlyMetrics hook at', new Date().toISOString(), 'for users:', subUserId, domUserId);
  const defaultResponse: MonthlyMetricsData = {
    dataArray: [],
    monthlyTotals: { tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 }
  };

  try {
    const monthDates = generateMonthDays();
    const metrics = new Map<string, MonthlyDataItem>();
    monthDates.forEach(date => metrics.set(date, {
      date, tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0
    }));

    const today = new Date();
    const start = startOfMonth(today).toISOString();
    const end = endOfMonth(today).toISOString();

    logger.debug('Monthly chart date range:', { start, end });

    // Fetch task completions - simplified counting
    const { data: taskEntries, error: taskError } = await supabase
      .from('task_completion_history')
      .select('task_id, completed_at')
      .in('user_id', [subUserId, domUserId])
      .gte('completed_at', start)
      .lt('completed_at', end);
    if (taskError) logger.error('Error loading task_completion_history for monthly hook', taskError);
    else if (taskEntries) {
      logger.debug('Monthly task completions found:', taskEntries.length);
      taskEntries.forEach(entry => {
        const date = format(new Date(entry.completed_at), 'yyyy-MM-dd');
        if (metrics.has(date)) {
          metrics.get(date)!.tasksCompleted++;
        }
      });
    }

    // Fetch rule violations
    const { data: ruleEntries, error: ruleError } = await supabase
      .from('rule_violations')
      .select('violation_date')
      .in('user_id', [subUserId, domUserId])
      .gte('violation_date', start)
      .lt('violation_date', end);
    if (ruleError) logger.error('Error loading rule_violations for monthly hook', ruleError);
    else if (ruleEntries) {
      ruleEntries.forEach(entry => {
        const date = format(new Date(entry.violation_date), 'yyyy-MM-dd');
        if (metrics.has(date)) metrics.get(date)!.rulesBroken++;
      });
    }

    // Fetch reward usages
    const { data: rewardEntries, error: rewardError } = await supabase
      .from('reward_usage')
      .select('created_at')
      .in('user_id', [subUserId, domUserId])
      .gte('created_at', start)
      .lt('created_at', end);
    if (rewardError) logger.error('Error loading reward_usage for monthly hook', rewardError);
    else if (rewardEntries) {
      rewardEntries.forEach(entry => {
        const date = format(new Date(entry.created_at), 'yyyy-MM-dd');
        if (metrics.has(date)) metrics.get(date)!.rewardsRedeemed++;
      });
    }

    // Fetch punishment history
    const { data: punishmentEntries, error: punishmentError } = await supabase
      .from('punishment_history')
      .select('applied_date')
      .in('user_id', [subUserId, domUserId])
      .gte('applied_date', start)
      .lt('applied_date', end);
    if (punishmentError) logger.error('Error loading punishment_history for monthly hook', punishmentError);
    else if (punishmentEntries) {
      punishmentEntries.forEach(entry => {
        const date = format(new Date(entry.applied_date), 'yyyy-MM-dd');
        if (metrics.has(date)) metrics.get(date)!.punishments++;
      });
    }

    const dataArray = Array.from(metrics.values());
    const monthlyTotals = dataArray.reduce((acc, item) => ({
      tasksCompleted: acc.tasksCompleted + item.tasksCompleted,
      rulesBroken: acc.rulesBroken + item.rulesBroken,
      rewardsRedeemed: acc.rewardsRedeemed + item.rewardsRedeemed,
      punishments: acc.punishments + item.punishments
    }), { tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 });
    
    logger.debug('Monthly chart data prepared via hook. Monthly totals:', monthlyTotals);
    return { dataArray, monthlyTotals };
  } catch (err) {
    logger.error('Error in fetchMonthlyData in hook:', err);
    toast({
      title: 'Error loading chart data',
      description: 'There was a problem loading the monthly metrics.',
      variant: 'destructive'
    });
    return defaultResponse;
  }
};

interface UseMonthlyMetricsOptions {
  enabled?: boolean;
}

export const useMonthlyMetrics = (options?: UseMonthlyMetricsOptions) => {
  const { subUserId, domUserId, isLoadingUserIds } = useUserIds();
  
  const isEnabled = !isLoadingUserIds && !!subUserId && !!domUserId && (options?.enabled ?? true);
  
  logger.debug('[useMonthlyMetrics] Query enabled check:', {
    isLoadingUserIds,
    subUserId,
    domUserId,
    optionsEnabled: options?.enabled,
    finalEnabled: isEnabled
  });
  
  return useQuery<MonthlyMetricsData, Error>({
    queryKey: [...MONTHLY_METRICS_QUERY_KEY, subUserId, domUserId],
    queryFn: () => fetchMonthlyData(subUserId!, domUserId!),
    enabled: isEnabled,
    ...STANDARD_QUERY_CONFIG,
  });
};
