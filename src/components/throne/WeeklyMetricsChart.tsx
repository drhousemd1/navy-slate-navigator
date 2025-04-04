
import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfWeek, addDays } from 'date-fns';

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

  // Generate an array with the days of the current week
  const generateWeekDays = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Start week on Sunday
    
    return Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(weekStart, index);
      return {
        day: format(date, 'EEE'), // e.g., "Mon", "Tue"
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
        setError(null);
        
        // Initialize the week days
        const weekDays = generateWeekDays();
        console.log('Week days generated:', weekDays);
        
        // Create a map for easy access to each day's data
        const metricsMap = new Map(weekDays.map(day => [day.date, { ...day }]));
        
        // Get the start of the current week for our date range queries
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 0 });
        const weekStartISOString = weekStart.toISOString();
        
        // 1. Fetch task completions
        const { data: taskCompletions, error: taskError } = await supabase
          .rpc('get_task_completions_for_week', { 
            week_start: weekStartISOString 
          });

        if (taskError) {
          console.error('Error fetching task completions:', taskError.message);
          // Continue with other fetches even if this one fails
        } else if (taskCompletions) {
          console.log('Task completions fetched:', taskCompletions);
          
          // Update the metricsMap with task completion data
          taskCompletions.forEach((completion: { completion_date: string, completion_count: number }) => {
            try {
              const completionDate = format(new Date(completion.completion_date), 'yyyy-MM-dd');
              if (metricsMap.has(completionDate)) {
                const dayData = metricsMap.get(completionDate);
                if (dayData) {
                  dayData.tasksCompleted = completion.completion_count;
                  metricsMap.set(completionDate, dayData);
                }
              }
            } catch (parseError) {
              console.error('Error parsing completion date:', parseError);
            }
          });
        }
        
        // 2. Fetch rule violations
        const { data: ruleViolations, error: violationsError } = await supabase
          .from('rule_violations')
          .select('violation_date')
          .gte('violation_date', weekStartISOString);
          
        if (violationsError) {
          console.error('Error fetching rule violations:', violationsError.message);
        } else if (ruleViolations && ruleViolations.length > 0) {
          console.log('Rule violations fetched:', ruleViolations);
          
          // Group violations by date
          const violationsByDate: Record<string, number> = {};
          
          ruleViolations.forEach(violation => {
            try {
              const violationDate = format(new Date(violation.violation_date), 'yyyy-MM-dd');
              violationsByDate[violationDate] = (violationsByDate[violationDate] || 0) + 1;
            } catch (parseError) {
              console.error('Error parsing violation date:', parseError);
            }
          });
          
          // Update metricsMap with violation counts
          Object.entries(violationsByDate).forEach(([date, count]) => {
            if (metricsMap.has(date)) {
              const dayData = metricsMap.get(date);
              if (dayData) {
                dayData.rulesViolated = count;
                metricsMap.set(date, dayData);
              }
            }
          });
        }
        
        // 3. Fetch rewards usage
        const { data: rewardsUsage, error: rewardsError } = await supabase
          .from('reward_usage')
          .select('created_at')
          .gte('created_at', weekStartISOString);
          
        if (rewardsError) {
          console.error('Error fetching rewards usage:', rewardsError.message);
        } else if (rewardsUsage) {
          console.log('Rewards usage fetched:', rewardsUsage);
          
          // Update metricsMap with rewards usage
          rewardsUsage.forEach(usage => {
            try {
              const usageDate = format(new Date(usage.created_at), 'yyyy-MM-dd');
              if (metricsMap.has(usageDate)) {
                const dayData = metricsMap.get(usageDate);
                if (dayData) {
                  dayData.rewardsUsed += 1;
                  metricsMap.set(usageDate, dayData);
                }
              }
            } catch (parseError) {
              console.error('Error parsing rewards usage date:', parseError);
            }
          });
        }
        
        // 4. Fetch punishments
        const { data: punishmentsApplied, error: punishmentsError } = await supabase
          .from('punishment_history')
          .select('applied_date')
          .gte('applied_date', weekStartISOString);
          
        if (punishmentsError) {
          console.error('Error fetching punishments:', punishmentsError.message);
        } else if (punishmentsApplied) {
          console.log('Punishments fetched:', punishmentsApplied);
          
          // Update metricsMap with punishments
          punishmentsApplied.forEach(punishment => {
            try {
              const punishmentDate = format(new Date(punishment.applied_date), 'yyyy-MM-dd');
              if (metricsMap.has(punishmentDate)) {
                const dayData = metricsMap.get(punishmentDate);
                if (dayData) {
                  dayData.punishmentsApplied += 1;
                  metricsMap.set(punishmentDate, dayData);
                }
              }
            } catch (parseError) {
              console.error('Error parsing punishment date:', parseError);
            }
          });
        }
        
        // Convert the map back to an array and sort by day number
        const chartData = Array.from(metricsMap.values()).sort((a, b) => a.dayNumber - b.dayNumber);
        console.log('Final chart data:', chartData);
        
        // Calculate summary metrics
        const summaryMetrics = {
          tasksCompleted: chartData.reduce((sum, day) => sum + day.tasksCompleted, 0),
          rulesViolated: chartData.reduce((sum, day) => sum + day.rulesViolated, 0),
          rewardsUsed: chartData.reduce((sum, day) => sum + day.rewardsUsed, 0),
          punishmentsApplied: chartData.reduce((sum, day) => sum + day.punishmentsApplied, 0)
        };
        
        // Update state with the processed data
        setData(chartData);
        
        // Notify parent component if callback is provided
        if (onDataLoaded) {
          onDataLoaded(summaryMetrics);
        }
        
      } catch (error) {
        console.error('Error fetching metrics data:', error);
        setError('Failed to load metrics data');
        
        // Return empty data in case of error
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

  if (loading) {
    return (
      <div className="w-full h-80 bg-navy border border-light-navy rounded-lg p-4">
        <p className="text-white text-sm mb-2">Loading metrics data...</p>
        <Skeleton className="w-full h-[calc(100%-24px)] bg-light-navy/30" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-navy border border-light-navy rounded-lg p-6 text-center">
        <p className="text-red-400 mb-1">Error loading metrics: {error}</p>
        <p className="text-gray-400 text-sm">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-navy border border-light-navy rounded-lg">
      {!hideTitle && <h3 className="text-lg font-medium text-white px-4 pt-4 mb-4">Weekly Activity Metrics</h3>}
      
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
