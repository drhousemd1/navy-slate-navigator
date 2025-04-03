import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Legend
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfWeek, addDays, parseISO, subDays } from 'date-fns';

interface MetricsData {
  day: string;
  dayNumber: number;
  date: string;
  tasksCompleted: number;
  rulesViolated: number;
  rewardsUsed: number;
  punishmentsApplied: number;
}

interface WeeklyMetricsSummary {
  tasksCompleted: number;
  rulesViolated: number;
  rewardsUsed: number;
  punishmentsApplied: number;
}

interface WeeklyMetricsChartProps {
  hideTitle?: boolean;
  onDataLoaded?: (summaryData: WeeklyMetricsSummary) => void;
}

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
    label: 'Rewards Redeemed'
  },
  punishmentsApplied: {
    color: '#ea384c', // red
    label: 'Punishments'
  }
};

export const WeeklyMetricsChart: React.FC<WeeklyMetricsChartProps> = ({ 
  hideTitle = false,
  onDataLoaded 
}) => {
  const [data, setData] = useState<MetricsData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const generateWeekDays = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    
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
        console.log('Fetching metrics data...');
        setLoading(true);
        
        const weekDays = generateWeekDays();
        console.log('Generated week days:', weekDays);
        const metricsMap = new Map(weekDays.map(day => [day.date, day]));

        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 0 });
        const weekStartStr = weekStart.toISOString();
        
        const { data: taskCompletionData, error: taskCompletionError } = await supabase
          .from('task_completion_history')
          .select('completed_at')
          .gte('completed_at', weekStartStr);
          
        if (taskCompletionError) {
          console.error('Error fetching task completion history:', taskCompletionError.message);
          setError('Failed to load task completion data');
        } else {
          console.log('Task completions fetched:', taskCompletionData?.length || 0);
          
          taskCompletionData?.forEach(completion => {
            if (completion.completed_at) {
              try {
                const completedDate = format(parseISO(completion.completed_at), 'yyyy-MM-dd');
                if (metricsMap.has(completedDate)) {
                  const dayData = metricsMap.get(completedDate);
                  if (dayData) {
                    dayData.tasksCompleted += 1;
                    metricsMap.set(completedDate, dayData);
                  }
                }
              } catch (dateError) {
                console.error('Error parsing task completion date:', dateError);
              }
            }
          });
        }
        
        const { data: rewardsData, error: rewardsError } = await supabase
          .from('reward_usage')
          .select('created_at');
          
        if (rewardsError) {
          console.error('Error fetching rewards usage:', rewardsError.message);
          setError(prev => prev || 'Failed to load rewards data');
        } else {
          console.log('Rewards usage fetched:', rewardsData?.length || 0, rewardsData);
          
          rewardsData?.forEach(reward => {
            if (reward.created_at) {
              try {
                const usedDate = format(new Date(reward.created_at), 'yyyy-MM-dd');
                if (metricsMap.has(usedDate)) {
                  const dayData = metricsMap.get(usedDate);
                  if (dayData) {
                    dayData.rewardsUsed += 1;
                    metricsMap.set(usedDate, dayData);
                  }
                }
              } catch (dateError) {
                console.error('Error parsing reward date:', dateError);
              }
            }
          });
        }
        
        const { data: punishmentsData, error: punishmentsError } = await supabase
          .from('punishment_history')
          .select('applied_date');
          
        if (punishmentsError) {
          console.error('Error fetching punishments:', punishmentsError.message);
          setError(prev => prev || 'Failed to load punishments data');
        } else {
          console.log('Punishments fetched:', punishmentsData?.length || 0, punishmentsData);
          
          punishmentsData?.forEach(punishment => {
            if (punishment.applied_date) {
              try {
                const appliedDate = format(new Date(punishment.applied_date), 'yyyy-MM-dd');
                if (metricsMap.has(appliedDate)) {
                  const dayData = metricsMap.get(appliedDate);
                  if (dayData) {
                    dayData.punishmentsApplied += 1;
                    metricsMap.set(appliedDate, dayData);
                  }
                }
              } catch (dateError) {
                console.error('Error parsing punishment date:', dateError);
              }
            }
          });
        }
        
        const chartData = Array.from(metricsMap.values()).sort((a, b) => a.dayNumber - b.dayNumber);
        console.log('Final chart data:', chartData);
        
        const summaryMetrics = {
          tasksCompleted: chartData.reduce((sum, day) => sum + day.tasksCompleted, 0),
          rulesViolated: chartData.reduce((sum, day) => sum + day.rulesViolated, 0),
          rewardsUsed: chartData.reduce((sum, day) => sum + day.rewardsUsed, 0),
          punishmentsApplied: chartData.reduce((sum, day) => sum + day.punishmentsApplied, 0)
        };
        
        setData(chartData);
        
        if (onDataLoaded) {
          onDataLoaded(summaryMetrics);
        }
        
      } catch (err) {
        console.error('Error in fetchMetricsData:', err);
        setError(err instanceof Error ? err.message : 'Failed to load metrics data');
        
        const emptyData = generateWeekDays();
        setData(emptyData);
        
        if (onDataLoaded) {
          onDataLoaded({
            tasksCompleted: 0,
            rulesViolated: 0,
            rewardsUsed: 0,
            punishmentsApplied: 0
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMetricsData();
  }, [onDataLoaded]);

  useEffect(() => {
    console.log('Chart data to render:', data);
    console.log('Loading state:', loading);
  }, [data, loading]);

  if (loading) {
    return (
      <div className="w-full h-80 bg-navy border border-light-navy rounded-lg p-4">
        <p className="text-white text-sm mb-2">Loading metrics data...</p>
        <Skeleton className="w-full h-[calc(100%-24px)] bg-light-navy/30" />
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className="w-full bg-navy border border-light-navy rounded-lg p-6 text-center">
        <p className="text-red-400 mb-1">Error loading metrics: {error}</p>
        <p className="text-gray-400 text-sm">Please try refreshing the page.</p>
      </div>
    );
  }

  console.log('Final render data:', data);

  return (
    <div className="w-full bg-navy border border-light-navy rounded-lg">
      {!hideTitle && <h3 className="text-lg font-medium text-white px-4 pt-4 mb-4">Weekly Activity Metrics</h3>}
      {error && (
        <div className="mb-4 px-3 py-2 bg-red-900/30 border border-red-900/50 rounded text-sm text-red-300 mx-4">
          Note: Some data couldn't be loaded. Showing available metrics.
        </div>
      )}
      <ChartContainer 
        className="w-full h-80 pl-0"
        config={chartConfig}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 5,
              left: -20,
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
            <ChartTooltip />
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
              name="Rewards Redeemed" 
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

      <div className="flex justify-between items-center flex-wrap px-4 pb-4 gap-2">
        <span className="text-xs whitespace-nowrap" style={{ color: chartConfig.tasksCompleted.color }}>
          Tasks Completed
        </span>
        <span className="text-xs whitespace-nowrap" style={{ color: chartConfig.rulesViolated.color }}>
          Rules Broken
        </span>
        <span className="text-xs whitespace-nowrap" style={{ color: chartConfig.rewardsUsed.color }}>
          Rewards Redeemed
        </span>
        <span className="text-xs whitespace-nowrap" style={{ color: chartConfig.punishmentsApplied.color }}>
          Punishments
        </span>
      </div>
    </div>
  );
};
