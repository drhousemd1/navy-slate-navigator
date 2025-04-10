
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

export interface WeeklyMetricsSummary {
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

interface WeeklyMetricsChartProps {
  onDataLoaded?: (summaryData: WeeklyMetricsSummary) => void;
}

interface DailyData {
  date: string;
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

const WeeklyMetricsChart: React.FC<WeeklyMetricsChartProps> = ({ onDataLoaded }) => {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get current week's start and end dates
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 7);
        
        // Generate array of the 7 days of the week
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const date = addDays(weekStart, i);
          return format(date, 'yyyy-MM-dd');
        });
        
        // Initialize data for the week with zeros
        const initialData = weekDays.map(date => ({
          date,
          tasksCompleted: 0,
          rulesBroken: 0,
          rewardsRedeemed: 0,
          punishments: 0
        }));
        
        // Fetch task completions
        const { data: taskCompletions, error: taskError } = await supabase
          .from('task_completion_history')
          .select('completed_at')
          .gte('completed_at', weekStart.toISOString())
          .lt('completed_at', weekEnd.toISOString());
          
        if (taskError) throw new Error(`Error fetching tasks: ${taskError.message}`);
        
        // Fetch rule violations
        const { data: ruleViolations, error: ruleError } = await supabase
          .from('rule_violations')
          .select('violation_date')
          .gte('violation_date', weekStart.toISOString())
          .lt('violation_date', weekEnd.toISOString());
          
        if (ruleError) throw new Error(`Error fetching rule violations: ${ruleError.message}`);
        
        // Fetch reward usages
        const { data: rewardUsages, error: rewardError } = await supabase
          .from('reward_usage')
          .select('created_at')
          .gte('created_at', weekStart.toISOString())
          .lt('created_at', weekEnd.toISOString());
          
        if (rewardError) throw new Error(`Error fetching rewards: ${rewardError.message}`);
        
        // Fetch punishments
        const { data: punishments, error: punishmentError } = await supabase
          .from('punishment_history')
          .select('applied_date')
          .gte('applied_date', weekStart.toISOString())
          .lt('applied_date', weekEnd.toISOString());
          
        if (punishmentError) throw new Error(`Error fetching punishments: ${punishmentError.message}`);
        
        // Process the data
        const processedData = [...initialData];
        
        // Helper function to increment a metric for a date
        const incrementMetric = (dateStr: string, metric: keyof DailyData) => {
          const day = processedData.find(d => d.date === dateStr);
          if (day && typeof day[metric] === 'number') {
            (day[metric] as number) += 1;
          }
        };
        
        // Process task completions
        taskCompletions?.forEach(task => {
          if (task.completed_at) {
            const dateStr = new Date(task.completed_at).toISOString().split('T')[0];
            incrementMetric(dateStr, 'tasksCompleted');
          }
        });
        
        // Process rule violations
        ruleViolations?.forEach(rule => {
          if (rule.violation_date) {
            const dateStr = new Date(rule.violation_date).toISOString().split('T')[0];
            incrementMetric(dateStr, 'rulesBroken');
          }
        });
        
        // Process reward usages
        rewardUsages?.forEach(reward => {
          if (reward.created_at) {
            const dateStr = new Date(reward.created_at).toISOString().split('T')[0];
            incrementMetric(dateStr, 'rewardsRedeemed');
          }
        });
        
        // Process punishments
        punishments?.forEach(punishment => {
          if (punishment.applied_date) {
            const dateStr = new Date(punishment.applied_date).toISOString().split('T')[0];
            incrementMetric(dateStr, 'punishments');
          }
        });
        
        // Set the data
        setData(processedData);
        
        // Calculate summary totals
        const summary: WeeklyMetricsSummary = {
          tasksCompleted: processedData.reduce((sum, day) => sum + day.tasksCompleted, 0),
          rulesBroken: processedData.reduce((sum, day) => sum + day.rulesBroken, 0),
          rewardsRedeemed: processedData.reduce((sum, day) => sum + day.rewardsRedeemed, 0),
          punishments: processedData.reduce((sum, day) => sum + day.punishments, 0)
        };
        
        // Call the callback with the summary data if provided
        if (onDataLoaded) {
          onDataLoaded(summary);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching metrics data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
        
        toast({
          title: "Error loading weekly metrics",
          description: err instanceof Error ? err.message : 'Unknown error occurred',
          variant: "destructive"
        });
      }
    };
    
    fetchData();
  }, [onDataLoaded]);
  
  // Check if there's any data to display
  const hasData = !loading && !error && data.some(
    day => day.tasksCompleted > 0 || day.rulesBroken > 0 || 
           day.rewardsRedeemed > 0 || day.punishments > 0
  );
  
  return (
    <Card className="bg-navy border border-light-navy rounded-lg">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Weekly Activity</h2>
        
        <div className="w-full" style={{ height: 300 }}>
          {loading && (
            <div className="w-full h-64 bg-light-navy/30 animate-pulse rounded flex items-center justify-center">
              <span className="text-white">Loading weekly metrics...</span>
            </div>
          )}
          
          {!loading && error && (
            <div className="w-full h-64 bg-red-900/20 rounded flex items-center justify-center">
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}
          
          {!loading && !error && !hasData && (
            <div className="w-full h-64 flex items-center justify-center border border-dashed border-gray-700 rounded-lg">
              <span className="text-gray-400 text-sm">No activity data to display for this week</span>
            </div>
          )}
          
          {!loading && !error && hasData && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={data} 
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
