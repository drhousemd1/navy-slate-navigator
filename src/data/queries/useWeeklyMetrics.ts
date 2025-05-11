
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { loadWeeklyMetricsFromDB, saveWeeklyMetricsToDB } from '@/data/indexedDB/useIndexedDB';
import { STANDARD_QUERY_CONFIG } from '@/lib/react-query-config';

// Define interfaces for weekly metrics data
export interface WeeklyMetricsSummary {
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

// Fetch weekly metrics data from Supabase
const fetchWeeklySummaryData = async (): Promise<WeeklyMetricsSummary> => {
  try {
    // Get current week's start and end dates (Monday-based)
    const today = new Date();
    const diff = today.getDay();
    const mondayDiff = diff === 0 ? -6 : 1 - diff; // Convert Sunday (0) to be -6 days from Monday
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayDiff);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    console.log('Fetching weekly data from', weekStart.toISOString(), 'to', weekEnd.toISOString());
    
    // Fetch task completions
    const { data: taskCompletions, error: taskError } = await supabase
      .from('task_completion_history')
      .select('task_id, completed_at')
      .gte('completed_at', weekStart.toISOString())
      .lt('completed_at', weekEnd.toISOString());
      
    if (taskError) throw new Error(`Error fetching tasks: ${taskError.message}`);
    
    // Count unique task completions (one per task per day)
    const uniqueTasksPerDay = new Set();
    taskCompletions?.forEach(completion => {
      const dateKey = format(new Date(completion.completed_at), 'yyyy-MM-dd') + '-' + completion.task_id;
      uniqueTasksPerDay.add(dateKey);
    });
    
    // Fetch rule violations
    const { data: ruleViolations, error: ruleError } = await supabase
      .from('rule_violations')
      .select('*')
      .gte('violation_date', weekStart.toISOString())
      .lt('violation_date', weekEnd.toISOString());
      
    if (ruleError) throw new Error(`Error fetching rule violations: ${ruleError.message}`);
    
    // Fetch reward usages
    const { data: rewardUsages, error: rewardError } = await supabase
      .from('reward_usage')
      .select('*')
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString());
      
    if (rewardError) throw new Error(`Error fetching rewards: ${rewardError.message}`);
    
    // Fetch punishments
    const { data: punishments, error: punishmentError } = await supabase
      .from('punishment_history')
      .select('*')
      .gte('applied_date', weekStart.toISOString())
      .lt('applied_date', weekEnd.toISOString());
      
    if (punishmentError) throw new Error(`Error fetching punishments: ${punishmentError.message}`);
    
    // Calculate summary counts
    return {
      tasksCompleted: uniqueTasksPerDay.size || 0,
      rulesBroken: ruleViolations?.length || 0,
      rewardsRedeemed: rewardUsages?.length || 0,
      punishments: punishments?.length || 0
    };
  } catch (err) {
    console.error('Error fetching metrics summary data:', err);
    return {
      tasksCompleted: 0,
      rulesBroken: 0,
      rewardsRedeemed: 0,
      punishments: 0
    };
  }
};

// Hook for weekly summary metrics
export function useWeeklyMetrics() {
  const { 
    data = { 
      tasksCompleted: 0, 
      rulesBroken: 0, 
      rewardsRedeemed: 0, 
      punishments: 0 
    },
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['weekly-metrics-summary'],
    queryFn: async () => {
      try {
        // First try to get from IndexedDB
        const cachedData = await loadWeeklyMetricsFromDB();
        
        if (cachedData) {
          console.log('Found cached weekly metrics in IndexedDB');
          
          // Update the cache in the background
          fetchWeeklySummaryData()
            .then(latestData => {
              saveWeeklyMetricsToDB(latestData);
            })
            .catch(error => {
              console.error('Error updating cached weekly metrics:', error);
            });
          
          return cachedData;
        }
        
        // If no cache, fetch from API
        console.log('No cached weekly metrics found, fetching from API');
        const freshData = await fetchWeeklySummaryData();
        
        // Save to IndexedDB
        await saveWeeklyMetricsToDB(freshData);
        
        return freshData;
      } catch (error) {
        console.error('Error in weekly metrics query:', error);
        throw error;
      }
    },
    ...STANDARD_QUERY_CONFIG
  });

  return {
    weeklyMetrics: data,
    isLoading,
    error,
    refetch
  };
}
