
import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';

interface MetricsData {
  day: string;
  dayNumber: number;
  tasksCompleted: number;
  rulesViolated: number;
  rewardsUsed: number;
  punishmentsApplied: number;
}

// Configuration for chart colors and labels
const chartConfig = {
  tasksCompleted: {
    color: '#0EA5E9', // sky blue
    label: 'Tasks Completed'
  },
  rulesViolated: {
    color: '#F97316', // bright orange
    label: 'Rules Broken'
  },
  rewardsUsed: {
    color: '#9b87f5', // primary purple
    label: 'Rewards Used'
  },
  punishmentsApplied: {
    color: '#ea384c', // red
    label: 'Punishments'
  }
};

export const WeeklyMetricsChart = () => {
  const [data, setData] = useState<MetricsData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Generate day labels for the current week
  const generateWeekDays = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Starting from Sunday
    
    return Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(weekStart, index);
      return {
        day: format(date, 'EEE'),
        dayNumber: index,
        date: format(date, 'yyyy-MM-dd'),
        tasksCompleted: 0,
        rulesViolated: 0,
        rewardsUsed: 0,
        punishmentsApplied: 0
      };
    });
  };

  useEffect(() => {
    const fetchMetricsData = async () => {
      try {
        setLoading(true);
        
        // Initialize data structure with days of the week
        const weekDays = generateWeekDays();
        const metricsMap = new Map(weekDays.map(day => [day.date, day]));
        
        // Get completed tasks for the week
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('last_completed_date')
          .eq('completed', true);
        
        if (tasksError) throw new Error(`Error fetching tasks: ${tasksError.message}`);
        
        // Count tasks completed by day
        tasksData?.forEach(task => {
          if (task.last_completed_date) {
            const completedDate = format(parseISO(task.last_completed_date), 'yyyy-MM-dd');
            if (metricsMap.has(completedDate)) {
              const dayData = metricsMap.get(completedDate);
              if (dayData) {
                dayData.tasksCompleted += 1;
                metricsMap.set(completedDate, dayData);
              }
            }
          }
        });
        
        // Get rewards usage data
        const { data: rewardsData, error: rewardsError } = await supabase
          .from('reward_usage')
          .select('created_at')
          .eq('used', true);
          
        if (rewardsError) throw new Error(`Error fetching rewards: ${rewardsError.message}`);
        
        // Count rewards used by day
        rewardsData?.forEach(reward => {
          const usedDate = format(new Date(reward.created_at), 'yyyy-MM-dd');
          if (metricsMap.has(usedDate)) {
            const dayData = metricsMap.get(usedDate);
            if (dayData) {
              dayData.rewardsUsed += 1;
              metricsMap.set(usedDate, dayData);
            }
          }
        });
        
        // Get punishment history data
        const { data: punishmentsData, error: punishmentsError } = await supabase
          .from('punishment_history')
          .select('applied_date');
          
        if (punishmentsError) throw new Error(`Error fetching punishments: ${punishmentsError.message}`);
        
        // Count punishments by day
        punishmentsData?.forEach(punishment => {
          const appliedDate = format(new Date(punishment.applied_date), 'yyyy-MM-dd');
          if (metricsMap.has(appliedDate)) {
            const dayData = metricsMap.get(appliedDate);
            if (dayData) {
              dayData.punishmentsApplied += 1;
              metricsMap.set(appliedDate, dayData);
            }
          }
        });
        
        // Since we don't have rules violations data yet, we'll leave it at 0
        // This can be updated when rules violation tracking is implemented
        
        // Convert map back to array and sort by day number
        const chartData = Array.from(metricsMap.values()).sort((a, b) => a.dayNumber - b.dayNumber);
        setData(chartData);
      } catch (err) {
        console.error('Error fetching metrics data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load metrics data');
      } finally {
        setLoading(false);
      }
    };

    fetchMetricsData();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-80 bg-navy border border-light-navy rounded-lg p-4">
        <Skeleton className="w-full h-full bg-light-navy/30" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-navy border border-light-navy rounded-lg p-6 text-center">
        <p className="text-red-400">Error loading metrics: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-navy border border-light-navy rounded-lg p-4">
      <h3 className="text-lg font-medium text-white mb-4">Weekly Activity Metrics</h3>
      <ChartContainer 
        className="h-80"
        config={chartConfig}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1F2C" />
            <XAxis 
              dataKey="day"
              stroke="#8E9196"
              tick={{ fill: '#D1D5DB' }}
            />
            <YAxis 
              stroke="#8E9196"
              tick={{ fill: '#D1D5DB' }}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
            />
            <Legend />
            <Bar 
              dataKey="tasksCompleted" 
              name="Tasks Completed" 
              fill={chartConfig.tasksCompleted.color} 
              radius={[4, 4, 0, 0]} 
            />
            <Bar 
              dataKey="rulesViolated" 
              name="Rules Broken" 
              fill={chartConfig.rulesViolated.color} 
              radius={[4, 4, 0, 0]} 
            />
            <Bar 
              dataKey="rewardsUsed" 
              name="Rewards Used" 
              fill={chartConfig.rewardsUsed.color} 
              radius={[4, 4, 0, 0]} 
            />
            <Bar 
              dataKey="punishmentsApplied" 
              name="Punishments" 
              fill={chartConfig.punishmentsApplied.color} 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};
