
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';
import { loadMonthlyMetricsFromDB, saveMonthlyMetricsToDB } from '@/data/indexedDB/useIndexedDB';

export interface MonthlyMetricsSummary {
  totalTaskCompletions: number;
  totalPointsEarned: number;
  totalRuleViolations: number;
}

interface DailyMetrics {
  date: string;
  taskCompletions: number;
  pointsEarned: number;
  ruleViolations: number;
}

export interface MonthlyMetricsResult {
  dataArray: DailyMetrics[];
  monthlyTotals: MonthlyMetricsSummary;
}

export function useMonthlyMetrics() {
  return useQuery({
    queryKey: ['monthly-metrics'],
    queryFn: async (): Promise<MonthlyMetricsResult> => {
      try {
        // Get current date and date 30 days ago
        const today = new Date();
        const thirtyDaysAgo = subDays(today, 30);
        
        // Format dates for Supabase queries
        const fromDate = thirtyDaysAgo.toISOString();
        const toDate = today.toISOString();
        
        // Fetch task completions for the past 30 days
        const { data: taskCompletions, error: taskError } = await supabase
          .from('task_completion_history')
          .select('completed_at, task_id')
          .gte('completed_at', fromDate)
          .lte('completed_at', toDate);
          
        if (taskError) {
          console.error('Error fetching task completions:', taskError);
          throw taskError;
        }
        
        // Fetch rule violations for the past 30 days
        const { data: ruleViolations, error: ruleError } = await supabase
          .from('rule_violations')
          .select('violation_date, rule_id')
          .gte('violation_date', fromDate)
          .lte('violation_date', toDate);
          
        if (ruleError) {
          console.error('Error fetching rule violations:', ruleError);
          throw ruleError;
        }
        
        // Get all tasks to calculate points
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id, points');
          
        if (tasksError) {
          console.error('Error fetching tasks:', tasksError);
          throw tasksError;
        }
        
        // Create a map of task IDs to points
        const taskPoints = new Map();
        tasks.forEach((task) => {
          taskPoints.set(task.id, task.points || 0);
        });
        
        // Group data by date
        const dataByDate = new Map<string, DailyMetrics>();
        
        // Initialize the past 30 days in the map
        for (let i = 0; i <= 30; i++) {
          const date = subDays(today, i);
          const dateStr = format(date, 'yyyy-MM-dd');
          dataByDate.set(dateStr, {
            date: dateStr,
            taskCompletions: 0,
            pointsEarned: 0,
            ruleViolations: 0
          });
        }
        
        // Process task completions
        taskCompletions.forEach((completion) => {
          const date = format(new Date(completion.completed_at), 'yyyy-MM-dd');
          const dayData = dataByDate.get(date) || {
            date,
            taskCompletions: 0,
            pointsEarned: 0,
            ruleViolations: 0
          };
          
          dayData.taskCompletions += 1;
          dayData.pointsEarned += taskPoints.get(completion.task_id) || 0;
          
          dataByDate.set(date, dayData);
        });
        
        // Process rule violations
        ruleViolations.forEach((violation) => {
          const date = format(new Date(violation.violation_date), 'yyyy-MM-dd');
          const dayData = dataByDate.get(date) || {
            date,
            taskCompletions: 0,
            pointsEarned: 0,
            ruleViolations: 0
          };
          
          dayData.ruleViolations += 1;
          
          dataByDate.set(date, dayData);
        });
        
        // Convert map to array and sort by date
        const dataArray = Array.from(dataByDate.values()).sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Calculate monthly totals
        const monthlyTotals = dataArray.reduce(
          (acc, day) => {
            acc.totalTaskCompletions += day.taskCompletions;
            acc.totalPointsEarned += day.pointsEarned;
            acc.totalRuleViolations += day.ruleViolations;
            return acc;
          },
          {
            totalTaskCompletions: 0,
            totalPointsEarned: 0,
            totalRuleViolations: 0
          }
        );
        
        const result = {
          dataArray,
          monthlyTotals
        };
        
        // Cache the result
        await saveMonthlyMetricsToDB(result);
        
        return result;
      } catch (error) {
        console.error('Error in monthly metrics:', error);
        
        // Try to return cached data if available
        const cachedData = await loadMonthlyMetricsFromDB();
        if (cachedData) {
          return cachedData;
        }
        
        throw error;
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    initialData: async () => {
      return await loadMonthlyMetricsFromDB();
    }
  });
}
