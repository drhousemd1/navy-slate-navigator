
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfWeek } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export interface WeeklyMetricsSummary {
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

interface WeeklyMetricsChartProps {
  onDataLoaded?: (summary: WeeklyMetricsSummary) => void;
}

const WeeklyMetricsChart: React.FC<WeeklyMetricsChartProps> = ({ onDataLoaded }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<any[]>([]);

  // Generate date range for the past week
  const dateRange = useMemo(() => {
    const today = new Date();
    const startDate = startOfWeek(today);
    const dates = [];
    
    for (let i = 0; i < 7; i++) {
      dates.push(format(subDays(today, 6 - i), 'yyyy-MM-dd'));
    }
    
    return {
      dates,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd')
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching data for date range:', dateRange);
        
        // Initialize data structure with dates
        const metricsMap = new Map();
        dateRange.dates.forEach(date => {
          metricsMap.set(date, {
            date,
            tasksCompleted: 0,
            rulesBroken: 0,
            rewardsRedeemed: 0,
            punishments: 0
          });
        });
        
        // Fetch task completions
        const { data: taskCompletions, error: taskError } = await supabase
          .from('task_completions')
          .select('*')
          .gte('completed_at', dateRange.startDate)
          .lte('completed_at', dateRange.endDate);
          
        if (taskError) throw new Error(`Error fetching task completions: ${taskError.message}`);
        
        // Process task completions
        taskCompletions?.forEach(task => {
          const date = task.completed_at.split('T')[0];
          if (metricsMap.has(date)) {
            const dayData = metricsMap.get(date);
            dayData.tasksCompleted += 1;
            metricsMap.set(date, dayData);
          }
        });
        
        // Fetch rule violations
        const { data: ruleViolations, error: ruleError } = await supabase
          .from('rule_violations')
          .select('*')
          .gte('created_at', dateRange.startDate)
          .lte('created_at', dateRange.endDate);
          
        if (ruleError) throw new Error(`Error fetching rule violations: ${ruleError.message}`);
        
        // Process rule violations
        ruleViolations?.forEach(violation => {
          const date = violation.created_at.split('T')[0];
          if (metricsMap.has(date)) {
            const dayData = metricsMap.get(date);
            dayData.rulesBroken += 1;
            metricsMap.set(date, dayData);
          }
        });
        
        // Fetch reward usages
        const { data: rewardUsages, error: rewardError } = await supabase
          .from('reward_usages')
          .select('*')
          .gte('used_at', dateRange.startDate)
          .lte('used_at', dateRange.endDate);
          
        if (rewardError) throw new Error(`Error fetching reward usages: ${rewardError.message}`);
        
        // Process reward usages
        rewardUsages?.forEach(usage => {
          const date = usage.used_at.split('T')[0];
          if (metricsMap.has(date)) {
            const dayData = metricsMap.get(date);
            dayData.rewardsRedeemed += 1;
            metricsMap.set(date, dayData);
          }
        });
        
        // Fetch punishments
        const { data: punishments, error: punishmentError } = await supabase
          .from('punishment_history')
          .select('*')
          .gte('applied_at', dateRange.startDate)
          .lte('applied_at', dateRange.endDate);
          
        if (punishmentError) throw new Error(`Error fetching punishments: ${punishmentError.message}`);
        
        // Process punishments
        punishments?.forEach(punishment => {
          const date = punishment.applied_at.split('T')[0];
          if (metricsMap.has(date)) {
            const dayData = metricsMap.get(date);
            dayData.punishments += 1;
            metricsMap.set(date, dayData);
          }
        });
        
        // Convert map to array and calculate summary
        const dataArray = Array.from(metricsMap.values());
        console.log('Final processed data:', dataArray);
        
        // Calculate summary for the week
        const summary: WeeklyMetricsSummary = {
          tasksCompleted: dataArray.reduce((sum, day) => sum + day.tasksCompleted, 0),
          rulesBroken: dataArray.reduce((sum, day) => sum + day.rulesBroken, 0),
          rewardsRedeemed: dataArray.reduce((sum, day) => sum + day.rewardsRedeemed, 0),
          punishments: dataArray.reduce((sum, day) => sum + day.punishments, 0)
        };
        
        // Update state with the processed data
        setActivityData(dataArray);
        
        // Call the callback with the summary data
        if (onDataLoaded) {
          onDataLoaded(summary);
        }
      } catch (err) {
        console.error('Error loading metrics:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        toast({
          title: "Error loading weekly metrics",
          description: err instanceof Error ? err.message : 'An unknown error occurred',
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [dateRange, onDataLoaded]);

  // Check if we have any data points
  const hasData = useMemo(() => {
    if (!activityData.length) return false;
    
    return activityData.some(day => 
      day.tasksCompleted > 0 || 
      day.rulesBroken > 0 || 
      day.rewardsRedeemed > 0 || 
      day.punishments > 0
    );
  }, [activityData]);

  const renderChart = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-60 w-full" />
        </div>
      );
    }
    
    if (error) {
      return <div className="text-red-500 p-4">Error: {error}</div>;
    }
    
    if (!hasData) {
      return (
        <div className="flex items-center justify-center h-60 text-gray-400">
          No activity data for this week
        </div>
      );
    }
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={activityData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#555" />
          <XAxis 
            dataKey="date" 
            stroke="#888" 
            tickFormatter={(value) => {
              const date = new Date(value);
              return format(date, 'EEE');
            }}
          />
          <YAxis stroke="#888" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#333', 
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#fff'
            }} 
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="tasksCompleted" 
            name="Tasks" 
            stroke="#69b0e3" 
            activeDot={{ r: 8 }} 
          />
          <Line 
            type="monotone" 
            dataKey="rulesBroken" 
            name="Rules Broken" 
            stroke="#fe9971" 
          />
          <Line 
            type="monotone" 
            dataKey="rewardsRedeemed" 
            name="Rewards" 
            stroke="#a67de9" 
          />
          <Line 
            type="monotone" 
            dataKey="punishments" 
            name="Punishments" 
            stroke="#e25a58" 
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="bg-navy border border-light-navy">
      <CardHeader className="pb-2">
        <CardTitle className="text-sky-400 flex justify-between items-center">
          <span>Weekly Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default WeeklyMetricsChart;
