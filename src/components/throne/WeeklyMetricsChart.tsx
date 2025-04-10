
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface WeeklyMetricsSummary {
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

interface WeeklyMetricsChartProps {
  onDataLoaded?: (summaryData: WeeklyMetricsSummary) => void;
}

const WeeklyMetricsChart: React.FC<WeeklyMetricsChartProps> = ({ onDataLoaded }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart colors configuration
  const chartColors = {
    tasksCompleted: '#0EA5E9',
    rulesBroken: '#F97316',
    rewardsRedeemed: '#9b87f5',
    punishments: '#ea384c'
  };
  
  // Chart labels for the legend
  const chartLabels = {
    tasksCompleted: 'Tasks Completed',
    rulesBroken: 'Rules Broken',
    rewardsRedeemed: 'Rewards Redeemed',
    punishments: 'Punishments'
  };
  
  // Function to fetch and process data
  useEffect(() => {
    async function fetchWeeklyData() {
      console.log('WeeklyMetricsChart: Starting to fetch weekly data');
      try {
        setIsLoading(true);
        setError(null);
        
        // Generate dates for current week (Monday to Sunday)
        const currentDate = new Date();
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekDates = Array.from({ length: 7 }, (_, i) => {
          const date = addDays(weekStart, i);
          return format(date, 'yyyy-MM-dd');
        });
        
        console.log('WeeklyMetricsChart: Week dates generated', weekDates);
        
        // Initialize data structure for the week
        const weeklyData = weekDates.map(date => ({
          date,
          tasksCompleted: 0,
          rulesBroken: 0,
          rewardsRedeemed: 0,
          punishments: 0
        }));
        
        // Prepare date range for queries
        const startDate = weekStart.toISOString();
        const endDate = addDays(weekStart, 7).toISOString();
        
        console.log('WeeklyMetricsChart: Date range', { startDate, endDate });
        
        // Fetch task completions
        const { data: taskCompletions, error: taskError } = await supabase
          .from('task_completion_history')
          .select('completed_at')
          .gte('completed_at', startDate)
          .lt('completed_at', endDate);
          
        if (taskError) {
          console.error('Error fetching task completions:', taskError);
          throw new Error(`Error fetching tasks: ${taskError.message}`);
        }
        
        console.log('WeeklyMetricsChart: Task completions fetched', taskCompletions?.length || 0);
        
        // Fetch rule violations
        const { data: ruleViolations, error: ruleError } = await supabase
          .from('rule_violations')
          .select('violation_date')
          .gte('violation_date', startDate)
          .lt('violation_date', endDate);
          
        if (ruleError) {
          console.error('Error fetching rule violations:', ruleError);
          throw new Error(`Error fetching rule violations: ${ruleError.message}`);
        }
        
        console.log('WeeklyMetricsChart: Rule violations fetched', ruleViolations?.length || 0);
        
        // Fetch reward usages
        const { data: rewardUsages, error: rewardError } = await supabase
          .from('reward_usage')
          .select('created_at')
          .gte('created_at', startDate)
          .lt('created_at', endDate);
          
        if (rewardError) {
          console.error('Error fetching reward usages:', rewardError);
          throw new Error(`Error fetching rewards: ${rewardError.message}`);
        }
        
        console.log('WeeklyMetricsChart: Reward usages fetched', rewardUsages?.length || 0);
        
        // Fetch punishments
        const { data: punishments, error: punishmentError } = await supabase
          .from('punishment_history')
          .select('applied_date')
          .gte('applied_date', startDate)
          .lt('applied_date', endDate);
          
        if (punishmentError) {
          console.error('Error fetching punishments:', punishmentError);
          throw new Error(`Error fetching punishments: ${punishmentError.message}`);
        }
        
        console.log('WeeklyMetricsChart: Punishments fetched', punishments?.length || 0);
        
        // Process task completions
        if (taskCompletions) {
          taskCompletions.forEach(task => {
            if (task.completed_at) {
              const dateStr = format(new Date(task.completed_at), 'yyyy-MM-dd');
              const dayIndex = weeklyData.findIndex(day => day.date === dateStr);
              if (dayIndex !== -1) {
                weeklyData[dayIndex].tasksCompleted += 1;
              }
            }
          });
        }
        
        // Process rule violations
        if (ruleViolations) {
          ruleViolations.forEach(rule => {
            if (rule.violation_date) {
              const dateStr = format(new Date(rule.violation_date), 'yyyy-MM-dd');
              const dayIndex = weeklyData.findIndex(day => day.date === dateStr);
              if (dayIndex !== -1) {
                weeklyData[dayIndex].rulesBroken += 1;
              }
            }
          });
        }
        
        // Process reward usages
        if (rewardUsages) {
          rewardUsages.forEach(reward => {
            if (reward.created_at) {
              const dateStr = format(new Date(reward.created_at), 'yyyy-MM-dd');
              const dayIndex = weeklyData.findIndex(day => day.date === dateStr);
              if (dayIndex !== -1) {
                weeklyData[dayIndex].rewardsRedeemed += 1;
              }
            }
          });
        }
        
        // Process punishments
        if (punishments) {
          punishments.forEach(punishment => {
            if (punishment.applied_date) {
              const dateStr = format(new Date(punishment.applied_date), 'yyyy-MM-dd');
              const dayIndex = weeklyData.findIndex(day => day.date === dateStr);
              if (dayIndex !== -1) {
                weeklyData[dayIndex].punishments += 1;
              }
            }
          });
        }
        
        console.log('WeeklyMetricsChart: Processed data', weeklyData);
        
        // Set the processed data to state
        setChartData(weeklyData);
        
        // Calculate summary totals
        const summary: WeeklyMetricsSummary = {
          tasksCompleted: weeklyData.reduce((sum, day) => sum + day.tasksCompleted, 0),
          rulesBroken: weeklyData.reduce((sum, day) => sum + day.rulesBroken, 0),
          rewardsRedeemed: weeklyData.reduce((sum, day) => sum + day.rewardsRedeemed, 0),
          punishments: weeklyData.reduce((sum, day) => sum + day.punishments, 0)
        };
        
        console.log('WeeklyMetricsChart: Summary calculated', summary);
        
        // Call the callback with the summary data if provided
        if (onDataLoaded) {
          onDataLoaded(summary);
        }
      } catch (err) {
        console.error('Error fetching weekly metrics data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        toast({
          title: "Error loading weekly metrics",
          description: err instanceof Error ? err.message : 'Unknown error occurred',
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
        console.log('WeeklyMetricsChart: Finished loading data');
      }
    }
    
    fetchWeeklyData();
  }, [onDataLoaded]);
  
  // Check if there's any data to display
  const hasData = chartData.some(
    day => day.tasksCompleted > 0 || day.rulesBroken > 0 || 
           day.rewardsRedeemed > 0 || day.punishments > 0
  );
  
  console.log('WeeklyMetricsChart render state:', { isLoading, hasError: !!error, hasData });
  
  return (
    <Card className="bg-navy border border-light-navy rounded-lg">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Weekly Activity</h2>
        
        <div className="w-full" style={{ height: 300 }}>
          {isLoading ? (
            <div className="w-full h-64 flex items-center justify-center">
              <div className="text-center">
                <Skeleton className="h-8 w-40 bg-light-navy/50 mb-2 mx-auto" />
                <p className="text-white">Loading weekly metrics...</p>
              </div>
            </div>
          ) : error ? (
            <div className="w-full h-64 bg-red-900/20 rounded flex items-center justify-center">
              <span className="text-red-400 text-sm p-4 text-center">{error}</span>
            </div>
          ) : !hasData ? (
            <div className="w-full h-64 flex items-center justify-center border border-dashed border-gray-700 rounded-lg">
              <span className="text-gray-400 text-sm p-4 text-center">No activity data to display for this week</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300} key="weekly-chart-container">
              <BarChart 
                data={chartData} 
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
              className={cn(
                "text-xs whitespace-nowrap",
                isLoading && "opacity-50"
              )} 
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
