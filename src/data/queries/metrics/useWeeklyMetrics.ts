import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { generateMondayBasedWeekDates } from '@/lib/utils';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';

export interface WeeklyDataItem {
  date: string;
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

export const WEEKLY_METRICS_QUERY_KEY = ['weekly-metrics'];

const fetchWeeklyData = async (): Promise<WeeklyDataItem[]> => {
  console.log('Fetching weekly chart data via useWeeklyMetrics hook at', new Date().toISOString());
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
      .gte('completed_at', start.toISOString())
      .lte('completed_at', end.toISOString());

    if (taskError) console.error('Error fetching task completions:', taskError);
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
      .gte('violation_date', start.toISOString())
      .lte('violation_date', end.toISOString());

    if (ruleError) console.error('Error fetching rule violations:', ruleError);
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
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (rewardError) console.error('Error fetching reward usages:', rewardError);
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
      .gte('applied_date', start.toISOString())
      .lte('applied_date', end.toISOString());

    if (punishmentError) console.error('Error fetching punishments:', punishmentError);
    else if (punishmentsData) {
      punishmentsData.forEach(entry => {
        const date = format(new Date(entry.applied_date), 'yyyy-MM-dd');
        if (metricsMap.has(date)) metricsMap.get(date)!.punishments++;
      });
    }

    const result = Array.from(metricsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    console.log('Weekly chart data prepared via hook:', result);
    return result;
  } catch (error) {
    console.error('Error fetching weekly data in hook:', error);
    toast({
      title: 'Error',
      description: 'Failed to fetch weekly activity data',
      variant: 'destructive'
    });
    return [];
  }
};

interface UseWeeklyMetricsOptions {
  enabled?: boolean;
}

export const useWeeklyMetrics = (options?: UseWeeklyMetricsOptions) => {
  return useQuery<WeeklyDataItem[], Error>({
    queryKey: WEEKLY_METRICS_QUERY_KEY,
    queryFn: fetchWeeklyData,
    ...STANDARD_QUERY_CONFIG,
    enabled: options?.enabled ?? false,
  });
};
