
// Please provide the correct file content to fix the initialData issue
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

// Define the result type for monthly metrics
export interface MonthlyMetricsResult {
  dataArray: any[];
  monthlyTotals: {
    completedTasks: number;
    points: number;
    punishmentsApplied: number;
    rewardsRedeemed: number;
  };
}

// Default empty result object
const defaultMonthlyMetrics: MonthlyMetricsResult = {
  dataArray: [],
  monthlyTotals: {
    completedTasks: 0,
    points: 0,
    punishmentsApplied: 0,
    rewardsRedeemed: 0
  }
};

export const useMonthlyMetrics = (year = new Date().getFullYear(), month = new Date().getMonth() + 1) => {
  return useQuery({
    queryKey: ['monthly-metrics', year, month],
    queryFn: async (): Promise<MonthlyMetricsResult> => {
      try {
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          throw new Error('User not authenticated');
        }
        
        // Calculate date range for the month
        const startDate = startOfMonth(new Date(year, month - 1));
        const endDate = endOfMonth(new Date(year, month - 1));
        
        // Format dates for database queries
        const startDateString = format(startDate, 'yyyy-MM-dd');
        const endDateString = format(endDate, 'yyyy-MM-dd');
        
        // Create an array of all days in the month
        const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
        
        // Initialize data array with one entry per day
        const dataArray = daysInMonth.map(day => {
          const dateString = format(day, 'yyyy-MM-dd');
          return {
            date: dateString,
            completedTasks: 0,
            points: 0,
            punishmentsApplied: 0,
            rewardsRedeemed: 0
          };
        });
        
        // Create a map for faster lookups
        const dataByDate = dataArray.reduce((acc, item) => {
          acc[item.date] = item;
          return acc;
        }, {} as Record<string, any>);
        
        // 1. Get task completions
        const { data: taskCompletions, error: taskError } = await supabase
          .from('task_completion_history')
          .select('completed_at, tasks!inner(points)')
          .gte('completed_at', startDateString)
          .lte('completed_at', endDateString)
          .eq('user_id', userData.user.id);
          
        if (taskError) {
          console.error('Error fetching task completions:', taskError);
        } else if (taskCompletions) {
          taskCompletions.forEach(completion => {
            const dateString = format(new Date(completion.completed_at), 'yyyy-MM-dd');
            if (dataByDate[dateString]) {
              dataByDate[dateString].completedTasks += 1;
              dataByDate[dateString].points += completion.tasks?.points || 0;
            }
          });
        }
        
        // 2. Get punishment applications
        const { data: punishments, error: punishmentError } = await supabase
          .from('punishment_history')
          .select('applied_date, points_deducted')
          .gte('applied_date', startDateString)
          .lte('applied_date', endDateString);
          
        if (punishmentError) {
          console.error('Error fetching punishments:', punishmentError);
        } else if (punishments) {
          punishments.forEach(punishment => {
            const dateString = format(new Date(punishment.applied_date), 'yyyy-MM-dd');
            if (dataByDate[dateString]) {
              dataByDate[dateString].punishmentsApplied += 1;
              dataByDate[dateString].points -= punishment.points_deducted || 0;
            }
          });
        }
        
        // 3. Get reward redemptions
        const { data: rewards, error: rewardError } = await supabase
          .from('reward_usage')
          .select('created_at, rewards!inner(cost, is_dom_reward)')
          .gte('created_at', startDateString)
          .lte('created_at', endDateString);
          
        if (rewardError) {
          console.error('Error fetching rewards:', rewardError);
        } else if (rewards) {
          rewards.forEach(usage => {
            // Skip dom rewards as they use a different point system
            if (usage.rewards?.is_dom_reward) return;
            
            const dateString = format(new Date(usage.created_at), 'yyyy-MM-dd');
            if (dataByDate[dateString]) {
              dataByDate[dateString].rewardsRedeemed += 1;
              dataByDate[dateString].points -= usage.rewards?.cost || 0;
            }
          });
        }
        
        // Calculate monthly totals
        const monthlyTotals = dataArray.reduce(
          (acc, day) => {
            acc.completedTasks += day.completedTasks;
            acc.points += day.points;
            acc.punishmentsApplied += day.punishmentsApplied;
            acc.rewardsRedeemed += day.rewardsRedeemed;
            return acc;
          },
          { completedTasks: 0, points: 0, punishmentsApplied: 0, rewardsRedeemed: 0 }
        );
        
        return {
          dataArray,
          monthlyTotals
        };
      } catch (err) {
        console.error('Error fetching monthly metrics:', err);
        return defaultMonthlyMetrics;
      }
    },
    initialData: defaultMonthlyMetrics, // Fixed: use a proper defaultMonthlyMetrics object instead of a function
    staleTime: 300000, // 5 minutes
  });
};
