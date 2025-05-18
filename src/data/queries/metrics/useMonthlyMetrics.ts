
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { toast } from '@/hooks/use-toast';

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

const fetchMonthlyData = async (): Promise<MonthlyMetricsData> => {
  console.log('Fetching monthly chart data via useMonthlyMetrics hook at', new Date().toISOString());
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

    // Fetch task completions
    const { data: taskEntries, error: taskError } = await supabase
      .from('task_completion_history')
      .select('task_id, completed_at')
      .gte('completed_at', start)
      .lte('completed_at', end);
    if (taskError) console.error('Error loading task_completion_history for monthly hook', taskError);
    else if (taskEntries) {
      const tasksByDate = new Map<string, Set<string>>();
      taskEntries.forEach(entry => {
        const date = format(new Date(entry.completed_at), 'yyyy-MM-dd');
        if (!tasksByDate.has(date)) tasksByDate.set(date, new Set());
        tasksByDate.get(date)!.add(entry.task_id);
      });
      tasksByDate.forEach((taskIds, date) => {
        if (metrics.has(date)) metrics.get(date)!.tasksCompleted = taskIds.size;
      });
    }

    // Fetch rule violations
    const { data: ruleEntries, error: ruleError } = await supabase
      .from('rule_violations')
      .select('violation_date')
      .gte('violation_date', start)
      .lte('violation_date', end);
    if (ruleError) console.error('Error loading rule_violations for monthly hook', ruleError);
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
      .gte('created_at', start)
      .lte('created_at', end);
    if (rewardError) console.error('Error loading reward_usage for monthly hook', rewardError);
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
      .gte('applied_date', start)
      .lte('applied_date', end);
    if (punishmentError) console.error('Error loading punishment_history for monthly hook', punishmentError);
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
    
    console.log('Monthly chart data prepared via hook. Monthly totals:', monthlyTotals);
    return { dataArray, monthlyTotals };
  } catch (err) {
    console.error('Error in fetchMonthlyData in hook:', err);
    toast({
      title: 'Error loading chart data',
      description: 'There was a problem loading the monthly metrics.',
      variant: 'destructive'
    });
    return defaultResponse;
  }
};

export const useMonthlyMetrics = () => {
  return useQuery<MonthlyMetricsData, Error>({
    queryKey: MONTHLY_METRICS_QUERY_KEY,
    queryFn: fetchMonthlyData,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Aggressive refresh
    staleTime: 0,
    gcTime: 0,
  });
};
