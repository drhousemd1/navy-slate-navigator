
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
    end.setHours(23, 59, 59, 999); // Include the full last day

    logger.debug('Fetching weekly summary from', start.toISOString(), 'to', end.toISOString(), 'for users:', subUserId, domUserId);
    logger.debug('Today is:', today.toISOString(), 'Day of week:', today.getDay());

    // Fetch task completions with task info to separate Dom/Sub
    const { data: taskCompletions, error: taskError } = await supabase
      .from('task_completion_history')
      .select(`
        task_id, 
        completed_at, 
        user_id,
        tasks!inner(is_dom_task)
      `)
      .in('user_id', [subUserId, domUserId])
      .gte('completed_at', start.toISOString())
      .lte('completed_at', end.toISOString());
    if (taskError) throw new Error(`Error fetching tasks: ${taskError.message}`);

    logger.debug('Task completions found:', taskCompletions?.length || 0);

    // Separate Dom and Sub task completions
    let subTasksCompleted = 0;
    let domTasksCompleted = 0;
    taskCompletions?.forEach(entry => {
      if (entry.tasks?.is_dom_task) {
        domTasksCompleted++;
      } else {
        subTasksCompleted++;
      }
    });

    const { data: ruleViolations, error: ruleError } = await supabase
      .from('rule_violations')
      .select('*')
      .in('user_id', [subUserId, domUserId])
      .gte('violation_date', start.toISOString())
      .lte('violation_date', end.toISOString());
    if (ruleError) throw new Error(`Error fetching rule violations: ${ruleError.message}`);

    logger.debug('Rule violations found:', ruleViolations?.length || 0);

    // Fetch reward usages with reward info to separate Dom/Sub
    const { data: rewardUsages, error: rewardError } = await supabase
      .from('reward_usage')
      .select(`
        created_at, 
        user_id,
        rewards!inner(is_dom_reward)
      `)
      .in('user_id', [subUserId, domUserId])
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());
    if (rewardError) throw new Error(`Error fetching rewards: ${rewardError.message}`);

    logger.debug('Reward usages found:', rewardUsages?.length || 0);

    // Separate Dom and Sub reward usages
    let subRewardsRedeemed = 0;
    let domRewardsRedeemed = 0;
    rewardUsages?.forEach(entry => {
      if (entry.rewards?.is_dom_reward) {
        domRewardsRedeemed++;
      } else {
        subRewardsRedeemed++;
      }
    });

    const { data: punishments, error: punishmentError } = await supabase
      .from('punishment_history')
      .select('*')
      .in('user_id', [subUserId, domUserId])
      .gte('applied_date', start.toISOString())
      .lte('applied_date', end.toISOString());
    if (punishmentError) throw new Error(`Error fetching punishments: ${punishmentError.message}`);

    logger.debug('Punishments found:', punishments?.length || 0);

    const result = {
      subTasksCompleted: subTasksCompleted || 0,
      domTasksCompleted: domTasksCompleted || 0,
      rulesBroken: ruleViolations?.length || 0,
      subRewardsRedeemed: subRewardsRedeemed || 0,
      domRewardsRedeemed: domRewardsRedeemed || 0,
      punishmentsPerformed: punishments?.length || 0
    };

    logger.debug('Weekly summary result:', result);
    return result;
  } catch (err) {
    logger.error('Error fetching metrics summary data:', err);
    return {
      subTasksCompleted: 0,
      domTasksCompleted: 0,
      rulesBroken: 0,
      subRewardsRedeemed: 0,
      domRewardsRedeemed: 0,
      punishmentsPerformed: 0
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
