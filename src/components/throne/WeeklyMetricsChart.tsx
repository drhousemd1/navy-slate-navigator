
import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { 
  format, 
  startOfWeek, 
  parseISO, 
  addDays 
} from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

// Hardcoded activity data
const activityData = [
  { date: '2025-04-01', tasksCompleted: 3, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 },
  { date: '2025-04-05', tasksCompleted: 2, rulesBroken: 1, rewardsRedeemed: 0, punishments: 0 },
  { date: '2025-04-10', tasksCompleted: 1, rulesBroken: 0, rewardsRedeemed: 1, punishments: 0 },
  { date: '2025-04-15', tasksCompleted: 4, rulesBroken: 0, rewardsRedeemed: 0, punishments: 1 },
  { date: '2025-04-20', tasksCompleted: 0, rulesBroken: 2, rewardsRedeemed: 0, punishments: 2 },
  { date: '2025-04-25', tasksCompleted: 3, rulesBroken: 0, rewardsRedeemed: 1, punishments: 0 },
  { date: '2025-04-28', tasksCompleted: 2, rulesBroken: 0, rewardsRedeemed: 1, punishments: 0 },
];

// Hardcoded weekly activity data
const weeklyActivityData = [
  { name: 'Tasks Completed', value: 2 },
  { name: 'Rules Broken', value: 0 },
  { name: 'Rewards Redeemed', value: 1 },
  { name: 'Punishments', value: 3 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div style={{ background: 'transparent', color: 'white', fontSize: '0.875rem', lineHeight: '1.4' }}>
      <div>{label}</div>
      {payload.map((entry: any, index: number) => (
        <div key={index} style={{ color: entry.fill || entry.color }}>
          {entry.name}: {entry.value}
        </div>
      ))}
    </div>
  );
};

export const WeeklyMetricsChart: React.FC<WeeklyMetricsChartProps> = ({ 
  hideTitle = false,
  onDataLoaded 
}) => {
  const [data, setData] = useState<MetricsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WeeklyMetricsSummary>({
    tasksCompleted: 0,
    rulesBroken: 0,
    rewardsRedeemed: 0,
    punishments: 0
  });

  // Helper functions
  const generateWeekDays = (): string[] => {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 0 }); // Sunday as start
    const weekDates = Array.from({ length: 7 }, (_, i) =>
      format(addDays(startOfCurrentWeek, i), 'yyyy-MM-dd')
    );
    
    return weekDates;
  };

  // Get the week dates once for XAxis ticks
  const weekDates = useMemo(() => generateWeekDays(), []);

  useEffect(() => {
    const loadHardcodedData = () => {
      try {
        setLoading(true);
        setError(null);

        const days = weekDates;
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
        const summaryData: WeeklyMetricsSummary = {
          tasksCompleted: weeklyActivityData[0].value,
          rulesBroken: weeklyActivityData[1].value,
          rewardsRedeemed: weeklyActivityData[2].value,
          punishments: weeklyActivityData[3].value
        };
        
        setSummary(summaryData);
        
        if (onDataLoaded) {
          console.log("[SUMMARY METRICS]", summaryData);
          onDataLoaded(summaryData);
        }
      } catch (err: any) {
        console.error('[Chart error]', err);
        setError('Unexpected chart error');
      } finally {
        setLoading(false);
      }
    };

    loadHardcodedData();
  }, [onDataLoaded, weekDates]);

  const hasContent = data.some(d =>
    d.tasksCompleted || d.rulesBroken || d.rewardsRedeemed || d.punishments
  );

  // Chart component
  const weeklyChart = useMemo(() => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A1F2C" />
          <XAxis 
            dataKey="date"
            ticks={weekDates}
            tickFormatter={(date) => {
              try {
                return format(new Date(date), 'EEE'); // Format as 'Sun', 'Mon', etc.
              } catch {
                return date;
              }
            }}
            interval={0} // show all days
            stroke="#8E9196"
            tick={{ fill: '#D1D5DB' }}
          />
          <YAxis 
            stroke="#8E9196"
            tick={{ fill: '#D1D5DB' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
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
    );
  }, [data, weekDates]);

  // Component render
  return (
    <>
      {/* Chart Container */}
      <div className="w-full bg-navy border border-light-navy rounded-lg mb-6">
        {!hideTitle && <h3 className="text-lg font-medium text-white px-4 pt-4 mb-4">Weekly Activity Metrics</h3>}
        
        {error && (
          <div className="mb-4 px-3 py-2 bg-red-900/30 border border-red-900/50 rounded text-sm text-red-300 mx-4">
            {error}
          </div>
        )}
        
        <div className="w-full px-4 pb-4">
          {loading && (
            <Skeleton className="w-full h-64 bg-light-navy/30" />
          )}
          {!loading && (
            <div className="h-64">
              {!hasContent && (
                <div className="flex items-center justify-center h-full text-white text-sm">
                  No activity data to display for this week.
                </div>
              )}
              {hasContent && weeklyChart}
            </div>
          )}
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
      
      {/* Summary Tiles Container */}
      {!loading && (
        <div className="bg-navy border border-light-navy rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="bg-light-navy rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sky-400 text-sm">Tasks Completed:</span>
                <span className="text-sm font-bold text-white">{summary.tasksCompleted}</span>
              </div>
            </div>
            <div className="bg-light-navy rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-orange-500 text-sm">Rules Broken:</span>
                <span className="text-sm font-bold text-white">{summary.rulesBroken}</span>
              </div>
            </div>
            <div className="bg-light-navy rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-purple-400 text-sm">Rewards Redeemed:</span>
                <span className="text-sm font-bold text-white">{summary.rewardsRedeemed}</span>
              </div>
            </div>
            <div className="bg-light-navy rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-red-400 text-sm">Punishments:</span>
                <span className="text-sm font-bold text-white">{summary.punishments}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
