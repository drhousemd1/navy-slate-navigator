
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
    // Use consistent date calculation with other hooks
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    logger.debug('Fetching weekly summary from', start.toISOString(), 'to', end.toISOString(), 'for users:', subUserId, domUserId);

    // Fetch task completions - count total completions, not unique per day
    const { data: taskCompletions, error: taskError } = await supabase
      .from('task_completion_history')
      .select('task_id, completed_at')
      .in('user_id', [subUserId, domUserId])
      .gte('completed_at', start.toISOString())
      .lt('completed_at', end.toISOString());
    if (taskError) throw new Error(`Error fetching tasks: ${taskError.message}`);

    logger.debug('Task completions found:', taskCompletions?.length || 0);

    const { data: ruleViolations, error: ruleError } = await supabase
      .from('rule_violations')
      .select('*')
      .in('user_id', [subUserId, domUserId])
      .gte('violation_date', start.toISOString())
      .lt('violation_date', end.toISOString());
    if (ruleError) throw new Error(`Error fetching rule violations: ${ruleError.message}`);

    logger.debug('Rule violations found:', ruleViolations?.length || 0);

    const { data: rewardUsages, error: rewardError } = await supabase
      .from('reward_usage')
      .select('*')
      .in('user_id', [subUserId, domUserId])
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString());
    if (rewardError) throw new Error(`Error fetching rewards: ${rewardError.message}`);

    logger.debug('Reward usages found:', rewardUsages?.length || 0);

    const { data: punishments, error: punishmentError } = await supabase
      .from('punishment_history')
      .select('*')
      .in('user_id', [subUserId, domUserId])
      .gte('applied_date', start.toISOString())
      .lt('applied_date', end.toISOString());
    if (punishmentError) throw new Error(`Error fetching punishments: ${punishmentError.message}`);

    logger.debug('Punishments found:', punishments?.length || 0);

    const result = {
      tasksCompleted: taskCompletions?.length || 0,
      rulesBroken: ruleViolations?.length || 0,
      rewardsRedeemed: rewardUsages?.length || 0,
      punishments: punishments?.length || 0
    };

    logger.debug('Weekly summary result:', result);
    return result;
  } catch (err) {
    logger.error('Error fetching metrics summary data:', err);
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
