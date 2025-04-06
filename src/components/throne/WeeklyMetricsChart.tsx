
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
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

interface WeeklyMetricsSummary {
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

interface WeeklyMetricsChartProps {
  hideTitle?: boolean;
  onDataLoaded?: (summaryData: WeeklyMetricsSummary) => void;
}

const chartConfig = {
  tasksCompleted: {
    color: '#0EA5E9',
    label: 'Tasks Completed'
  },
  rulesBroken: {
    color: '#F97316',
    label: 'Rules Broken'
  },
  rewardsRedeemed: {
    color: '#9b87f5',
    label: 'Rewards Redeemed'
  },
  punishments: {
    color: '#ea384c',
    label: 'Punishments'
  }
};

// Hardcoded weekly activity data
const weeklyActivityData = [
  { name: 'Tasks Completed', value: 2 },
  { name: 'Rules Broken', value: 0 },
  { name: 'Rewards Redeemed', value: 1 },
  { name: 'Punishments', value: 3 },
];

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
    const lastWeekStart = startOfWeek(addDays(today, -7), { weekStartsOn: 0 });
    return [...Array(7)].map((_, i) =>
      format(addDays(lastWeekStart, i), 'yyyy-MM-dd')
    );
  };

  const formatDate = (dateString: string): string => {
    return format(parseISO(dateString), 'yyyy-MM-dd');
  };

  useEffect(() => {
    const loadHardcodedData = () => {
      try {
        setLoading(true);
        setError(null);

        const days = generateWeekDays();
        const metricsMap = new Map<string, MetricsData>();

        // Initialize data for each day
        days.forEach((date) => {
          metricsMap.set(date, {
            date,
            tasksCompleted: 0,
            rulesBroken: 0,
            rewardsRedeemed: 0,
            punishments: 0
          });
        });

        // Use hardcoded data instead of fetching from Supabase
        // Distribute values across the week
        const dayIndex = 2; // Wednesday
        const dateKey = days[dayIndex];
        const dayData = metricsMap.get(dateKey);
        
        if (dayData) {
          dayData.tasksCompleted = weeklyActivityData[0].value;
          dayData.rulesBroken = weeklyActivityData[1].value;
          dayData.rewardsRedeemed = weeklyActivityData[2].value;
          dayData.punishments = weeklyActivityData[3].value;
        }

        const finalData = Array.from(metricsMap.values());
        console.log("[FINAL METRICS DATA]", finalData);
        
        setData(finalData);
        
        // Calculate summary for callback
        if (onDataLoaded) {
          const summary: WeeklyMetricsSummary = {
            tasksCompleted: weeklyActivityData[0].value,
            rulesBroken: weeklyActivityData[1].value,
            rewardsRedeemed: weeklyActivityData[2].value,
            punishments: weeklyActivityData[3].value
          };
          console.log("[SUMMARY METRICS]", summary);
          onDataLoaded(summary);
        }
      } catch (err: any) {
        console.error('[Chart error]', err);
        setError('Unexpected chart error');
      } finally {
        setLoading(false);
      }
    };

    loadHardcodedData();
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
