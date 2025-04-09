
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, parseISO, addDays, startOfWeek, formatISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export interface WeeklyMetricsSummary {
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

interface WeeklyMetricsChartProps {
  onDataLoaded?: (summaryData: WeeklyMetricsSummary) => void;
}

interface DailyMetricsData {
  date: string;
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

const WeeklyMetricsChart: React.FC<WeeklyMetricsChartProps> = ({ onDataLoaded }) => {
  const [metricsData, setMetricsData] = useState<DailyMetricsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Visual configuration for the chart
  const chartColors = {
    tasksCompleted: '#0EA5E9',
    rulesBroken: '#F97316',
    rewardsRedeemed: '#9b87f5',
    punishments: '#ea384c'
  };
  
  const chartLabels = {
    tasksCompleted: 'Tasks Completed',
    rulesBroken: 'Rules Broken',
    rewardsRedeemed: 'Rewards Redeemed',
    punishments: 'Punishments'
  };
  
  useEffect(() => {
    const fetchWeeklyData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        
        // Get the start and end dates for the current week (starting Monday)
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 7);
        const formattedStart = formatISO(weekStart);
        const formattedEnd = formatISO(weekEnd);
        
        // Create an array of dates for the week
        const weekDates = Array.from({ length: 7 }, (_, i) => {
          const date = addDays(weekStart, i);
          return format(date, 'yyyy-MM-dd');
        });
        
        // Initialize data structure with zeros for all dates
        const initialData = weekDates.map(date => ({
          date,
          tasksCompleted: 0,
          rulesBroken: 0,
          rewardsRedeemed: 0,
          punishments: 0
        }));
        
        // Fetch data from each table in parallel
        const [
          taskCompletionsResponse,
          ruleViolationsResponse,
          rewardUsagesResponse,
          punishmentsResponse
        ] = await Promise.all([
          // Task completions
          supabase
            .from('task_completion_history')
            .select('completed_at')
            .gte('completed_at', formattedStart)
            .lt('completed_at', formattedEnd),
          
          // Rule violations
          supabase
            .from('rule_violations')
            .select('violation_date')
            .gte('violation_date', formattedStart)
            .lt('violation_date', formattedEnd),
          
          // Reward usages
          supabase
            .from('reward_usage')
            .select('created_at')
            .gte('created_at', formattedStart)
            .lt('created_at', formattedEnd),
          
          // Punishments
          supabase
            .from('punishment_history')
            .select('applied_date')
            .gte('applied_date', formattedStart)
            .lt('applied_date', formattedEnd)
        ]);
        
        // Check for errors in any of the responses
        if (taskCompletionsResponse.error) throw new Error(`Error fetching task completions: ${taskCompletionsResponse.error.message}`);
        if (ruleViolationsResponse.error) throw new Error(`Error fetching rule violations: ${ruleViolationsResponse.error.message}`);
        if (rewardUsagesResponse.error) throw new Error(`Error fetching reward usages: ${rewardUsagesResponse.error.message}`);
        if (punishmentsResponse.error) throw new Error(`Error fetching punishments: ${punishmentsResponse.error.message}`);
        
        // Process the data into our structure
        const processedData = [...initialData];
        
        // Helper function to increment a metric for a specific date
        const incrementMetric = (dateStr: string, metricName: keyof DailyMetricsData) => {
          const dateIndex = processedData.findIndex(d => d.date === dateStr);
          if (dateIndex !== -1 && typeof processedData[dateIndex][metricName] === 'number') {
            (processedData[dateIndex][metricName] as number) += 1;
          }
        };
        
        // Process task completions
        taskCompletionsResponse.data?.forEach(item => {
          if (item.completed_at) {
            const dateStr = new Date(item.completed_at).toISOString().split('T')[0];
            incrementMetric(dateStr, 'tasksCompleted');
          }
        });
        
        // Process rule violations
        ruleViolationsResponse.data?.forEach(item => {
          if (item.violation_date) {
            const dateStr = new Date(item.violation_date).toISOString().split('T')[0];
            incrementMetric(dateStr, 'rulesBroken');
          }
        });
        
        // Process reward usages
        rewardUsagesResponse.data?.forEach(item => {
          if (item.created_at) {
            const dateStr = new Date(item.created_at).toISOString().split('T')[0];
            incrementMetric(dateStr, 'rewardsRedeemed');
          }
        });
        
        // Process punishments
        punishmentsResponse.data?.forEach(item => {
          if (item.applied_date) {
            const dateStr = new Date(item.applied_date).toISOString().split('T')[0];
            incrementMetric(dateStr, 'punishments');
          }
        });
        
        // Calculate summary totals
        const summary: WeeklyMetricsSummary = {
          tasksCompleted: processedData.reduce((sum, day) => sum + day.tasksCompleted, 0),
          rulesBroken: processedData.reduce((sum, day) => sum + day.rulesBroken, 0),
          rewardsRedeemed: processedData.reduce((sum, day) => sum + day.rewardsRedeemed, 0),
          punishments: processedData.reduce((sum, day) => sum + day.punishments, 0)
        };
        
        // Update the state with the processed data
        setMetricsData(processedData);
        
        // Call the callback if provided
        if (onDataLoaded) {
          onDataLoaded(summary);
        }
        
        // Set loading to false AFTER everything is done
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching weekly metrics:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
        setIsLoading(false);
        toast({
          title: "Error loading weekly metrics",
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          variant: "destructive"
        });
      }
    };
    
    fetchWeeklyData();
  }, [onDataLoaded]);
  
  // Check if there's any data to display
  const hasData = !isLoading && !errorMessage && metricsData.some(
    day => day.tasksCompleted > 0 || day.rulesBroken > 0 || 
           day.rewardsRedeemed > 0 || day.punishments > 0
  );
  
  return (
    <Card className="bg-navy border border-light-navy rounded-lg">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Weekly Activity</h2>
        
        <div className="w-full" style={{ height: 300 }}>
          {isLoading && (
            <div className="w-full h-64 bg-light-navy/30 animate-pulse rounded flex items-center justify-center">
              <span className="text-white">Loading weekly metrics...</span>
            </div>
          )}
          
          {!isLoading && errorMessage && (
            <div className="w-full h-64 bg-red-900/20 rounded flex items-center justify-center">
              <span className="text-red-400 text-sm">{errorMessage}</span>
            </div>
          )}
          
          {!isLoading && !errorMessage && !hasData && (
            <div className="w-full h-64 flex items-center justify-center border border-dashed border-gray-700 rounded-lg">
              <span className="text-gray-400 text-sm">No activity data to display for this week</span>
            </div>
          )}
          
          {!isLoading && !errorMessage && hasData && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={metricsData} 
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1F2C" />
                <XAxis
                  dataKey="date"
                  tickFormatter={date => format(parseISO(date), 'EEE')}
                  interval={0}
                  stroke="#8E9196"
                  tick={{ fill: '#D1D5DB' }}
                />
                <YAxis stroke="#8E9196" tick={{ fill: '#D1D5DB' }} />
                <Tooltip
                  cursor={false}
                  wrapperStyle={{ zIndex: 9999 }}
                  contentStyle={{ 
                    backgroundColor: '#0F172A', 
                    border: '1px solid #1E293B', 
                    borderRadius: '4px', 
                    padding: '8px' 
                  }}
                  offset={25}
                  formatter={(value, name) => [value, name]}
                  labelFormatter={label => format(parseISO(label), 'EEEE, MMM d')}
                />
                <Bar 
                  dataKey="tasksCompleted" 
                  name={chartLabels.tasksCompleted} 
                  fill={chartColors.tasksCompleted} 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="rulesBroken" 
                  name={chartLabels.rulesBroken} 
                  fill={chartColors.rulesBroken} 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="rewardsRedeemed" 
                  name={chartLabels.rewardsRedeemed} 
                  fill={chartColors.rewardsRedeemed} 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="punishments" 
                  name={chartLabels.punishments} 
                  fill={chartColors.punishments} 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        
        <div className="flex justify-between items-center flex-wrap mt-2 gap-2">
          {Object.entries(chartLabels).map(([key, label]) => (
            <span 
              key={key} 
              className="text-xs whitespace-nowrap" 
              style={{ color: chartColors[key as keyof typeof chartColors] }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default WeeklyMetricsChart;
