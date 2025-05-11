/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { endOfMonth, startOfMonth, format, eachDayOfInterval } from 'date-fns';
import { loadMonthlyMetricsFromDB, saveMonthlyMetricsToDB } from "../indexedDB/useIndexedDB";

// Types
export interface MonthlyDataItem {
  date: string;
  taskCompletions: number;
  pointsEarned: number;
  pointsSpent: number;
  taskCreations: number;
  ruleViolations: number;
}

export interface MonthlyMetricsSummary {
  taskCompletions: number;
  pointsEarned: number;
  pointsSpent: number;
  taskCreations: number;
  ruleViolations: number;
  punishments: number;
}

export interface MonthlyMetricsResult {
  dataArray: MonthlyDataItem[];
  monthlyTotals: MonthlyMetricsSummary;
}

// Hook for monthly metrics data
export function useMonthlyMetrics() {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['monthly-metrics'],
    queryFn: async () => {
      try {
        // First try to get from IndexedDB
        const cachedData = await loadMonthlyMetricsFromDB();

        if (cachedData) {
          console.log('Found cached monthly metrics in IndexedDB');
          return cachedData;
        }

        // If no cache, fetch from API
        console.log('No cached monthly metrics found, fetching from API');

        const today = new Date();
        const start = startOfMonth(today);
        const end = endOfMonth(today);

        const { data: taskCompletions, error: taskError } = await supabase
          .from('task_completion_history')
          .select('*')
          .gte('completed_at', start.toISOString())
          .lte('completed_at', end.toISOString());

        if (taskError) {
          console.error('Error loading task_completion_history', taskError);
        }

        const { data: ruleViolations, error: ruleError } = await supabase
          .from('rule_violations')
          .select('*')
          .gte('violation_date', start.toISOString())
          .lte('violation_date', end.toISOString());

        if (ruleError) {
          console.error('Error loading rule_violations', ruleError);
        }

        // Mock data for points earned and spent
        const pointsEarned = Math.floor(Math.random() * 100);
        const pointsSpent = Math.floor(Math.random() * 50);

        // Mock data for task creations
        const taskCreations = Math.floor(Math.random() * 10);

        // Generate array of dates for the current month
        const monthDates = eachDayOfInterval({ start, end }).map(date => format(date, 'yyyy-MM-dd'));

        // Combine data into a single array
        const dataArray: MonthlyDataItem[] = monthDates.map(date => {
          const taskCompletionsForDate = taskCompletions?.filter(item => format(new Date(item.completed_at), 'yyyy-MM-dd') === date).length || 0;
          const ruleViolationsForDate = ruleViolations?.filter(item => format(new Date(item.violation_date), 'yyyy-MM-dd') === date).length || 0;

          return {
            date,
            taskCompletions: taskCompletionsForDate,
            pointsEarned,
            pointsSpent,
            taskCreations,
            ruleViolations: ruleViolationsForDate
          };
        });

        // Calculate monthly totals
        const monthlyTotals: MonthlyMetricsSummary = {
          taskCompletions: dataArray.reduce((acc, item) => acc + item.taskCompletions, 0),
          pointsEarned: dataArray.reduce((acc, item) => acc + item.pointsEarned, 0),
          pointsSpent: dataArray.reduce((acc, item) => acc + item.pointsSpent, 0),
          taskCreations: dataArray.reduce((acc, item) => acc + item.taskCreations, 0),
          ruleViolations: dataArray.reduce((acc, item) => acc + item.ruleViolations, 0),
          punishments: 0
        };

        const result = { dataArray, monthlyTotals };

        // Save to IndexedDB
        await saveMonthlyMetricsToDB(result);

        return result;
      } catch (error) {
        console.error('Error in monthly metrics query:', error);
        throw error;
      }
    },
    refetchInterval: 5000, // More aggressive refresh for metrics data
    staleTime: 0,
    gcTime: 0
  });

  return {
    data,
    isLoading,
    error,
    refetch
  };
}
