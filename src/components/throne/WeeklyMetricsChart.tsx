
import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, parseISO, addDays, startOfWeek, formatISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface MetricsData {
  date: string;
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

export interface WeeklyMetricsSummary {
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

interface WeeklyMetricsChartProps {
  onDataLoaded?: (summaryData: WeeklyMetricsSummary) => void;
}

const chartConfig = {
  tasksCompleted: { color: '#0EA5E9', label: 'Tasks Completed' },
  rulesBroken: { color: '#F97316', label: 'Rules Broken' },
  rewardsRedeemed: { color: '#9b87f5', label: 'Rewards Redeemed' },
  punishments: { color: '#ea384c', label: 'Punishments' }
};

export const WeeklyMetricsChart: React.FC<WeeklyMetricsChartProps> = ({ onDataLoaded }) => {
  const [data, setData] = useState<MetricsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create an array of dates for the current week (Monday to Sunday)
  const weekDates = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // Start from Monday
    return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'));
  }, []);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 7);
        const isoStart = formatISO(weekStart);
        const isoEnd = formatISO(weekEnd);

        console.log('Fetching metrics for period:', isoStart, 'to', isoEnd);

        // Fetch task completions
        const { data: taskCompletions, error: taskError } = await supabase
          .from('task_completion_history')
          .select('completed_at')
          .gte('completed_at', isoStart)
          .lt('completed_at', isoEnd);

        if (taskError) throw new Error(`Task query error: ${taskError.message}`);
        
        // Fetch rule violations
        const { data: ruleViolations, error: ruleError } = await supabase
          .from('rule_violations')
          .select('violation_date')
          .gte('violation_date', isoStart)
          .lt('violation_date', isoEnd);

        if (ruleError) throw new Error(`Rule violation query error: ${ruleError.message}`);

        // Fetch reward usage/redemptions
        const { data: rewardUsages, error: rewardError } = await supabase
          .from('reward_usage')
          .select('created_at')
          .gte('created_at', isoStart)
          .lt('created_at', isoEnd);

        if (rewardError) throw new Error(`Reward usage query error: ${rewardError.message}`);

        // Fetch punishments history
        const { data: punishmentHistory, error: punishmentError } = await supabase
          .from('punishment_history')
          .select('applied_date')
          .gte('applied_date', isoStart)
          .lt('applied_date', isoEnd);

        if (punishmentError) throw new Error(`Punishment history query error: ${punishmentError.message}`);

        console.log('Data fetched:', {
          tasks: taskCompletions?.length || 0,
          rules: ruleViolations?.length || 0,
          rewards: rewardUsages?.length || 0,
          punishments: punishmentHistory?.length || 0
        });

        // Initialize metrics map with zeroes for all dates
        const metricsMap = new Map<string, MetricsData>();
        weekDates.forEach(date => {
          metricsMap.set(date, {
            date,
            tasksCompleted: 0,
            rulesBroken: 0,
            rewardsRedeemed: 0,
            punishments: 0
          });
        });

        // Process task completions
        taskCompletions?.forEach(({ completed_at }) => {
          const date = format(parseISO(completed_at), 'yyyy-MM-dd');
          const entry = metricsMap.get(date);
          if (entry) entry.tasksCompleted += 1;
        });

        // Process rule violations
        ruleViolations?.forEach(({ violation_date }) => {
          const date = format(parseISO(violation_date), 'yyyy-MM-dd');
          const entry = metricsMap.get(date);
          if (entry) entry.rulesBroken += 1;
        });

        // Process reward redemptions
        rewardUsages?.forEach(({ created_at }) => {
          const date = format(parseISO(created_at), 'yyyy-MM-dd');
          const entry = metricsMap.get(date);
          if (entry) entry.rewardsRedeemed += 1;
        });

        // Process punishments
        punishmentHistory?.forEach(({ applied_date }) => {
          const date = format(parseISO(applied_date), 'yyyy-MM-dd');
          const entry = metricsMap.get(date);
          if (entry) entry.punishments += 1;
        });

        // Convert map to array for the chart
        const finalData = weekDates.map(d => metricsMap.get(d)!);
        console.log('Processed chart data:', finalData);
        setData(finalData);

        // Calculate summary totals
        const summary = finalData.reduce<WeeklyMetricsSummary>(
          (acc, curr) => {
            acc.tasksCompleted += curr.tasksCompleted;
            acc.rulesBroken += curr.rulesBroken;
            acc.rewardsRedeemed += curr.rewardsRedeemed;
            acc.punishments += curr.punishments;
            return acc;
          },
          { tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 }
        );

        console.log('Weekly metrics summary:', summary);
        if (onDataLoaded) onDataLoaded(summary);
      } catch (err: any) {
        console.error('Failed to load weekly metrics:', err);
        setError(`Error loading metrics: ${err.message}`);
        toast({
          title: "Error loading metrics",
          description: err.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [onDataLoaded, weekDates]);

  // Check if there's any data to display
  const hasContent = data.some(d =>
    d.tasksCompleted > 0 || d.rulesBroken > 0 || d.rewardsRedeemed > 0 || d.punishments > 0
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
          
          {!loading && !error && hasContent && (
            <div className="w-full h-full">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1F2C" />
                  <XAxis
                    dataKey="date"
                    ticks={weekDates}
                    tickFormatter={(date) => {
                      try {
                        return format(parseISO(date), 'EEE');
                      } catch {
                        return date;
                      }
                    }}
                    interval={0}
                    stroke="#8E9196"
                    tick={{ fill: '#D1D5DB' }}
                  />
                  <YAxis stroke="#8E9196" tick={{ fill: '#D1D5DB' }} />
                  <Tooltip
                    cursor={false}
                    wrapperStyle={{ zIndex: 9999 }}
                    contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '4px', padding: '8px' }}
                    offset={25}
                    formatter={(value, name) => [value, name]}
                    labelFormatter={(label) => {
                      try {
                        return format(parseISO(label), 'EEEE, MMM d');
                      } catch {
                        return label;
                      }
                    }}
                  />
                  <Bar dataKey="tasksCompleted" name={chartConfig.tasksCompleted.label} fill={chartConfig.tasksCompleted.color} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rulesBroken" name={chartConfig.rulesBroken.label} fill={chartConfig.rulesBroken.color} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rewardsRedeemed" name={chartConfig.rewardsRedeemed.label} fill={chartConfig.rewardsRedeemed.color} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="punishments" name={chartConfig.punishments.label} fill={chartConfig.punishments.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          
          {!loading && !error && !hasContent && (
            <div className="w-full h-64 flex items-center justify-center border border-dashed border-gray-700 rounded-lg">
              <span className="text-gray-400 text-sm">No activity data to display for this week</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center flex-wrap mt-2 gap-2">
          <span className="text-xs whitespace-nowrap" style={{ color: chartConfig.tasksCompleted.color }}>
            Tasks Completed
          </span>
          <span className="text-xs whitespace-nowrap" style={{ color: chartConfig.rulesBroken.color }}>
            Rules Broken
          </span>
          <span className="text-xs whitespace-nowrap" style={{ color: chartConfig.rewardsRedeemed.color }}>
            Rewards Redeemed
          </span>
          <span className="text-xs whitespace-nowrap" style={{ color: chartConfig.punishments.color }}>
            Punishments
          </span>
        </div>
      </div>
    </Card>
  );
};

export default WeeklyMetricsChart;
