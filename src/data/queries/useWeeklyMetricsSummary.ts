
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';
import { WeeklyMetricsSummary } from '@/components/throne/WeeklyMetricsSummary';
import { logger } from '@/lib/logger';
import { useUserIds } from '@/contexts/UserIdsContext';

// This is the type definition from the read-only file: src/components/throne/WeeklyMetricsSummary.ts
// export interface WeeklyMetricsSummary {
//   tasksCompleted: number;
//   rulesBroken: number;
//   rewardsRedeemed: number;
//   punishments: number;
// }

export const fetchWeeklyMetricsSummary = async (subUserId: string, domUserId: string): Promise<WeeklyMetricsSummary> => {
  try {
    const today = new Date();
    const diff = today.getDay();
    const mondayDiff = diff === 0 ? -6 : 1 - diff;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayDiff);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    logger.debug('Fetching weekly data from', weekStart.toISOString(), 'to', weekEnd.toISOString(), 'for users:', subUserId, domUserId);

    const { data: taskCompletions, error: taskError } = await supabase
      .from('task_completion_history')
      .select('task_id, completed_at')
      .in('user_id', [subUserId, domUserId])
      .gte('completed_at', weekStart.toISOString())
      .lt('completed_at', weekEnd.toISOString());
    if (taskError) throw new Error(`Error fetching tasks: ${taskError.message}`);

    const uniqueTasksPerDay = new Set();
    taskCompletions?.forEach(completion => {
      const dateKey = format(new Date(completion.completed_at), 'yyyy-MM-dd') + '-' + completion.task_id;
      uniqueTasksPerDay.add(dateKey);
    });

    const { data: ruleViolations, error: ruleError } = await supabase
      .from('rule_violations')
      .select('*')
      .in('user_id', [subUserId, domUserId])
      .gte('violation_date', weekStart.toISOString())
      .lt('violation_date', weekEnd.toISOString());
    if (ruleError) throw new Error(`Error fetching rule violations: ${ruleError.message}`);

    const { data: rewardUsages, error: rewardError } = await supabase
      .from('reward_usage')
      .select('*')
      .in('user_id', [subUserId, domUserId])
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString());
    if (rewardError) throw new Error(`Error fetching rewards: ${rewardError.message}`);

    const { data: punishments, error: punishmentError } = await supabase
      .from('punishment_history')
      .select('*')
      .in('user_id', [subUserId, domUserId])
      .gte('applied_date', weekStart.toISOString())
      .lt('applied_date', weekEnd.toISOString());
    if (punishmentError) throw new Error(`Error fetching punishments: ${punishmentError.message}`);

    return {
      tasksCompleted: uniqueTasksPerDay.size || 0,
      rulesBroken: ruleViolations?.length || 0,
      rewardsRedeemed: rewardUsages?.length || 0,
      punishments: punishments?.length || 0
    };
  } catch (err) {
    logger.error('Error fetching metrics summary data:', err);
    // Return a default or rethrow, React Query will handle it as an error state
    // For consistency with original behavior, let's return default structure on error within fetch
    return {
      tasksCompleted: 0,
      rulesBroken: 0,
      rewardsRedeemed: 0,
      punishments: 0
    };
  }
};

export function useWeeklyMetricsSummary() {
  const { subUserId, domUserId, isLoadingUserIds } = useUserIds();
  
  return useQuery<WeeklyMetricsSummary>({
    queryKey: ['weekly-metrics-summary', subUserId, domUserId],
    queryFn: () => fetchWeeklyMetricsSummary(subUserId!, domUserId!),
    enabled: !isLoadingUserIds && !!subUserId && !!domUserId,
    ...STANDARD_QUERY_CONFIG
  });
}
