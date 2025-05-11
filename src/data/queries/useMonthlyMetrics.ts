
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import { useQuery } from '@tanstack/react-query';
import { format, getMonth, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { loadMonthlyMetricsFromDB, saveMonthlyMetricsToDB } from '@/data/indexedDB/useIndexedDB';

// Define interfaces for monthly metrics data
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

export interface MonthlyMetricsResult {
  dataArray: MonthlyDataItem[];
  monthlyTotals: MonthlyMetricsSummary;
}

// Fetch monthly metrics data from Supabase
const fetchMonthlyData = async (): Promise<MonthlyMetricsResult> => {
  console.log('Fetching monthly chart data at', new Date().toISOString());
  try {
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    
    // Generate array of dates for the current month
    const monthDates = Array.from({ length: end.getDate() }, (_, i) => {
      const date = new Date(start);
      date.setDate(i + 1);
      return format(date, 'yyyy-MM-dd');
    });

    const metrics = new Map<string, MonthlyDataItem>();
    monthDates.forEach(date => metrics.set(date, {
      date, tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0
    }));

    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // Fetch task completions with unique daily counts
    const { data: taskEntries, error: taskError } = await supabase
      .from('task_completion_history')
      .select('task_id, completed_at')
      .gte('completed_at', startISO)
      .lte('completed_at', endISO);
    
    if (taskError) {
      console.error('Error loading task_completion_history', taskError);
    } else {
      console.log('Found task completions:', taskEntries?.length || 0);
      // Group by date and task_id to count uniquely per day
      const tasksByDate = new Map<string, Set<string>>();
      
      taskEntries?.forEach(entry => {
        const date = format(new Date(entry.completed_at), 'yyyy-MM-dd');
        if (!tasksByDate.has(date)) {
          tasksByDate.set(date, new Set());
        }
        tasksByDate.get(date)!.add(entry.task_id);
      });
      
      // Update counts based on unique task IDs per day
      tasksByDate.forEach((taskIds, date) => {
        if (metrics.has(date)) {
          metrics.get(date)!.tasksCompleted = taskIds.size;
        }
      });
    }

    // Fetch rule violations
    const { data: ruleEntries, error: ruleError } = await supabase
      .from('rule_violations')
      .select('*')
      .gte('violation_date', startISO)
      .lte('violation_date', endISO);
    
    if (ruleError) {
      console.error('Error loading rule_violations', ruleError);
    } else {
      console.log('Found rule violations:', ruleEntries?.length || 0);
      ruleEntries?.forEach(entry => {
        const date = format(new Date(entry.violation_date), 'yyyy-MM-dd');
        if (metrics.has(date)) {
          metrics.get(date)!.rulesBroken++;
        }
      });
    }

    // Fetch reward usages
    const { data: rewardEntries, error: rewardError } = await supabase
      .from('reward_usage')
      .select('*')
      .gte('created_at', startISO)
      .lte('created_at', endISO);
    
    if (rewardError) {
      console.error('Error loading reward_usage', rewardError);
    } else {
      console.log('Found reward usages:', rewardEntries?.length || 0);
      rewardEntries?.forEach(entry => {
        const date = format(new Date(entry.created_at), 'yyyy-MM-dd');
        if (metrics.has(date)) {
          metrics.get(date)!.rewardsRedeemed++;
        }
      });
    }

    // Fetch punishment history
    const { data: punishmentEntries, error: punishmentError } = await supabase
      .from('punishment_history')
      .select('*')
      .gte('applied_date', startISO)
      .lte('applied_date', endISO);
    
    if (punishmentError) {
      console.error('Error loading punishment_history', punishmentError);
    } else {
      console.log('Found punishments:', punishmentEntries?.length || 0);
      punishmentEntries?.forEach(entry => {
        const date = format(new Date(entry.applied_date), 'yyyy-MM-dd');
        if (metrics.has(date)) {
          metrics.get(date)!.punishments++;
        }
      });
    }

    const dataArray = Array.from(metrics.values());
    
    // Calculate monthly totals
    const monthlyTotals = dataArray.reduce((acc, item) => {
      return {
        tasksCompleted: acc.tasksCompleted + item.tasksCompleted,
        rulesBroken: acc.rulesBroken + item.rulesBroken,
        rewardsRedeemed: acc.rewardsRedeemed + item.rewardsRedeemed,
        punishments: acc.punishments + item.punishments
      };
    }, {
      tasksCompleted: 0,
      rulesBroken: 0,
      rewardsRedeemed: 0,
      punishments: 0
    });
    
    console.log('Monthly chart data prepared. Monthly totals:', monthlyTotals);
    return { dataArray, monthlyTotals };
  } catch (err) {
    console.error('Error in fetchMonthlyData:', err);
    toast({
      title: 'Error loading chart data',
      description: 'There was a problem loading the monthly metrics.',
      variant: 'destructive'
    });
    return { 
      dataArray: [], 
      monthlyTotals: { tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 } 
    };
  }
};

// Hook for monthly metrics data
export function useMonthlyMetrics() {
  const { 
    data = { 
      dataArray: [], 
      monthlyTotals: { tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 } 
    },
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
          
          // Update the cache in the background
          fetchMonthlyData()
            .then(latestData => {
              saveMonthlyMetricsToDB(latestData);
            })
            .catch(error => {
              console.error('Error updating cached monthly metrics:', error);
            });
          
          return cachedData;
        }
        
        // If no cache, fetch from API
        console.log('No cached monthly metrics found, fetching from API');
        const freshData = await fetchMonthlyData();
        
        // Save to IndexedDB
        await saveMonthlyMetricsToDB(freshData);
        
        return freshData;
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
    monthlyData: data.dataArray,
    monthlyTotals: data.monthlyTotals,
    isLoading,
    error,
    refetch
  };
}
