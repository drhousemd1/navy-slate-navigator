
import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, startOfWeek, parseISO, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';

interface MetricsData {
  date: string;
  tasksCompleted: number;
  rulesBroken: number;       // renamed from rulesViolated
  rewardsRedeemed: number;   // renamed from rewardsUsed
  punishments: number;       // renamed from punishmentsApplied
}

interface WeeklyMetricsSummary {
  tasksCompleted: number;
  rulesBroken: number;       // renamed from rulesViolated
  rewardsRedeemed: number;   // renamed from rewardsUsed
  punishments: number;       // renamed from punishmentsApplied
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
  rulesBroken: {
    color: '#F97316', // bright orange
    label: 'Rules Broken'
  },
  rewardsRedeemed: {
    color: '#9b87f5', // primary purple
    label: 'Rewards Redeemed'
  },
  punishments: {
    color: '#ea384c', // red
    label: 'Punishments'
  }
};

export const WeeklyMetricsChart: React.FC<WeeklyMetricsChartProps> = ({ 
  hideTitle = false,
  onDataLoaded 
}) => {
  const [data, setData] = useState<MetricsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper functions
  const generateWeekDays = (): string[] => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // 0 = Sunday
    return [...Array(7)].map((_, i) =>
      format(addDays(weekStart, i), 'yyyy-MM-dd')
    );
  };

  const formatDate = (dateString: string): string => {
    return format(parseISO(dateString), 'yyyy-MM-dd');
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        const days = generateWeekDays();
        const metricsMap = new Map<string, MetricsData>();

        days.forEach((date) => {
          metricsMap.set(date, {
            date,
            tasksCompleted: 0,
            rulesBroken: 0,          // renamed from rulesViolated
            rewardsRedeemed: 0,      // renamed from rewardsUsed
            punishments: 0           // renamed from punishmentsApplied
          });
        });

        // Task completions via RPC since this is already implemented in the database
        const { data: taskData, error: taskError } = await supabase
          .rpc('get_task_completions_for_week', { 
            week_start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd') 
          });

        if (taskError) {
          console.error('[RPC] get_task_completions_for_week failed:', taskError.message);
        } else {
          taskData?.forEach((entry) => {
            const raw = entry.completion_date;
            const formatted = formatDate(raw);
            console.log("[TASK]", { raw, formatted, matched: metricsMap.has(formatted) });
            const day = metricsMap.get(formatted);
            if (day) day.tasksCompleted = entry.completion_count || 0;
          });
        }

        // Rule violations
        const { data: ruleData, error: ruleError } = await supabase
          .from('rule_violations')
          .select('violation_date')
          .gte('violation_date', format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));

        if (ruleError) {
          console.error('[Table] rule_violations failed:', ruleError.message);
        } else {
          ruleData?.forEach((entry) => {
            const raw = entry.violation_date;
            const formatted = formatDate(raw);
            console.log("[RULE]", { raw, formatted, matched: metricsMap.has(formatted) });
            const day = metricsMap.get(formatted);
            if (day) day.rulesBroken += 1;  // renamed from rulesViolated
          });
        }

        // Reward uses - using the correct table name from the database
        const { data: rewardData, error: rewardError } = await supabase
          .from('reward_usage')
          .select('created_at')
          .gte('created_at', format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));

        if (rewardError) {
          console.error('[Table] reward_usage failed:', rewardError.message);
        } else {
          rewardData?.forEach((entry) => {
            const raw = entry.created_at;
            const formatted = formatDate(raw);
            console.log("[REWARD]", { raw, formatted, matched: metricsMap.has(formatted) });
            const day = metricsMap.get(formatted);
            if (day) day.rewardsRedeemed += 1;  // renamed from rewardsUsed
          });
        }

        // Punishments - using the correct table name from the database
        const { data: punishmentData, error: punishmentError } = await supabase
          .from('punishment_history')
          .select('applied_date')
          .gte('applied_date', format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));

        if (punishmentError) {
          console.error('[Table] punishment_history failed:', punishmentError.message);
        } else {
          punishmentData?.forEach((entry) => {
            const raw = entry.applied_date;
            const formatted = formatDate(raw);
            console.log("[PUNISHMENT]", { raw, formatted, matched: metricsMap.has(formatted) });
            const day = metricsMap.get(formatted);
            if (day) day.punishments += 1;  // renamed from punishmentsApplied
          });
        }

        const finalData = Array.from(metricsMap.values());
        setData(finalData);
        
        // Calculate summary for callback
        if (onDataLoaded) {
          const summary: WeeklyMetricsSummary = {
            tasksCompleted: finalData.reduce((sum, item) => sum + item.tasksCompleted, 0),
            rulesBroken: finalData.reduce((sum, item) => sum + item.rulesBroken, 0),
            rewardsRedeemed: finalData.reduce((sum, item) => sum + item.rewardsRedeemed, 0),
            punishments: finalData.reduce((sum, item) => sum + item.punishments, 0)
          };
          onDataLoaded(summary);
        }
      } catch (err: any) {
        console.error('[Chart error]', err);
        setError('Unexpected chart error');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [onDataLoaded]);

  const hasContent = data.some(d =>
    d.tasksCompleted || d.rulesBroken || d.rewardsRedeemed || d.punishments
  );

  // Memoize the chart to prevent unnecessary re-renders
  const memoizedChart = useMemo(() => {
    return (
      <ChartContainer 
        className="w-full h-full"
        config={chartConfig}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1F2C" />
            <XAxis 
              dataKey="date" 
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
              dataKey="rulesBroken" 
              name="Rules Broken" 
              fill={chartConfig.rulesBroken.color} 
              radius={[4, 4, 0, 0]} 
            />
            <Bar 
              dataKey="rewardsRedeemed" 
              name="Rewards Redeemed" 
              fill={chartConfig.rewardsRedeemed.color} 
              radius={[4, 4, 0, 0]} 
            />
            <Bar 
              dataKey="punishments" 
              name="Punishments" 
              fill={chartConfig.punishments.color} 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  }, [data]);

  return (
    <div className="w-full bg-navy border border-light-navy rounded-lg">
      {!hideTitle && <h3 className="text-lg font-medium text-white px-4 pt-4 mb-4">Weekly Activity Metrics</h3>}
      {error && (
        <div className="mb-4 px-3 py-2 bg-red-900/30 border border-red-900/50 rounded text-sm text-red-300 mx-4">
          {error}
        </div>
      )}
      <div className="w-full h-64 px-4 pb-4">
        {loading && (
          <Skeleton className="w-full h-full bg-light-navy/30" />
        )}
        {!loading && !hasContent && (
          <div className="flex items-center justify-center h-full text-white text-sm">
            No activity data to display for this week.
          </div>
        )}
        {!loading && hasContent && memoizedChart}
      </div>

      <div className="flex justify-between items-center flex-wrap px-4 pb-4 gap-2">
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
  );
};
