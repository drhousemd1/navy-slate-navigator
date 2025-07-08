
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { logger } from '@/lib/logger';
import { useUserIds } from '@/contexts/UserIdsContext';

export interface MonthlyDataItem {
  date: string;
  subTasksCompleted: number;
  domTasksCompleted: number;
  rulesBroken: number;
  subRewardsRedeemed: number;
  domRewardsRedeemed: number;
  punishmentsPerformed: number;
}

export interface MonthlyMetricsSummary {
  subTasksCompleted: number;
  domTasksCompleted: number;
  rulesBroken: number;
  subRewardsRedeemed: number;
  domRewardsRedeemed: number;
  punishmentsPerformed: number;
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
    monthlyTotals: { subTasksCompleted: 0, domTasksCompleted: 0, rulesBroken: 0, subRewardsRedeemed: 0, domRewardsRedeemed: 0, punishmentsPerformed: 0 }
  };

  try {
    const monthDates = generateMonthDays();
    const metrics = new Map<string, MonthlyDataItem>();
    monthDates.forEach(date => metrics.set(date, {
      date, subTasksCompleted: 0, domTasksCompleted: 0, rulesBroken: 0, subRewardsRedeemed: 0, domRewardsRedeemed: 0, punishmentsPerformed: 0
    }));

    const today = new Date();
    const startDate = startOfMonth(today);
    const endDate = endOfMonth(today);
    endDate.setHours(23, 59, 59, 999); // Include the full last day
    const start = startDate.toISOString();
    const end = endDate.toISOString();

    logger.debug('Monthly chart date range:', { start, end });

    // Fetch task completions with task info to separate Dom/Sub
    const { data: taskEntries, error: taskError } = await supabase
      .from('task_completion_history')
      .select(`
        task_id, 
        completed_at, 
        user_id,
        tasks!inner(is_dom_task)
      `)
      .in('user_id', [subUserId, domUserId])
      .gte('completed_at', start)
      .lte('completed_at', end);
    if (taskError) logger.error('Error loading task_completion_history for monthly hook', taskError);
    else if (taskEntries) {
      logger.debug('Monthly task completions found:', taskEntries.length);
      taskEntries.forEach(entry => {
        const date = format(new Date(entry.completed_at), 'yyyy-MM-dd');
        if (metrics.has(date)) {
          const dayMetrics = metrics.get(date)!;
          if (entry.tasks?.is_dom_task) {
            dayMetrics.domTasksCompleted++;
          } else {
            dayMetrics.subTasksCompleted++;
          }
        }
      });
    }

    // Fetch rule violations
    const { data: ruleEntries, error: ruleError } = await supabase
      .from('rule_violations')
      .select('violation_date')
      .in('user_id', [subUserId, domUserId])
      .gte('violation_date', start)
      .lte('violation_date', end);
    if (ruleError) logger.error('Error loading rule_violations for monthly hook', ruleError);
    else if (ruleEntries) {
      ruleEntries.forEach(entry => {
        const date = format(new Date(entry.violation_date), 'yyyy-MM-dd');
        if (metrics.has(date)) metrics.get(date)!.rulesBroken++;
      });
    }

    // Fetch reward usages with reward info to separate Dom/Sub
    const { data: rewardEntries, error: rewardError } = await supabase
      .from('reward_usage')
      .select(`
        created_at, 
        user_id,
        rewards!inner(is_dom_reward)
      `)
      .in('user_id', [subUserId, domUserId])
      .gte('created_at', start)
      .lte('created_at', end);
    if (rewardError) logger.error('Error loading reward_usage for monthly hook', rewardError);
    else if (rewardEntries) {
      rewardEntries.forEach(entry => {
        const date = format(new Date(entry.created_at), 'yyyy-MM-dd');
        if (metrics.has(date)) {
          const dayMetrics = metrics.get(date)!;
          if (entry.rewards?.is_dom_reward) {
            dayMetrics.domRewardsRedeemed++;
          } else {
            dayMetrics.subRewardsRedeemed++;
          }
        }
      });
    }

    // Fetch punishment history
    const { data: punishmentEntries, error: punishmentError } = await supabase
      .from('punishment_history')
      .select('applied_date')
      .in('user_id', [subUserId, domUserId])
      .gte('applied_date', start)
      .lte('applied_date', end);
    if (punishmentError) logger.error('Error loading punishment_history for monthly hook', punishmentError);
    else if (punishmentEntries) {
      punishmentEntries.forEach(entry => {
        const date = format(new Date(entry.applied_date), 'yyyy-MM-dd');
        if (metrics.has(date)) metrics.get(date)!.punishmentsPerformed++;
      });
    }

    const dataArray = Array.from(metrics.values());
    const monthlyTotals = dataArray.reduce((acc, item) => ({
      subTasksCompleted: acc.subTasksCompleted + item.subTasksCompleted,
      domTasksCompleted: acc.domTasksCompleted + item.domTasksCompleted,
      rulesBroken: acc.rulesBroken + item.rulesBroken,
      subRewardsRedeemed: acc.subRewardsRedeemed + item.subRewardsRedeemed,
      domRewardsRedeemed: acc.domRewardsRedeemed + item.domRewardsRedeemed,
      punishmentsPerformed: acc.punishmentsPerformed + item.punishmentsPerformed
    }), { subTasksCompleted: 0, domTasksCompleted: 0, rulesBroken: 0, subRewardsRedeemed: 0, domRewardsRedeemed: 0, punishmentsPerformed: 0 });
    
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
