
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  parseISO, 
  formatISO, 
  eachDayOfInterval,
  addDays 
} from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export const WeeklyMetricsChart: React.FC<WeeklyMetricsChartProps> = ({ 
  onDataLoaded 
}) => {
  const [data, setData] = useState<MetricsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Helper functions
  const generateWeekDays = (): string[] => {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 0 }); // Sunday as start
    const weekDates = Array.from({ length: 7 }, (_, i) =>
      format(addDays(startOfCurrentWeek, i), 'yyyy-MM-dd')
    );
    
    return weekDates;
  };

  const formatDate = (dateString: string): string => {
    return format(parseISO(dateString), 'yyyy-MM-dd');
  };

  // Get the week dates once for XAxis ticks
  const weekDates = useMemo(() => generateWeekDays(), []);

  // Generate monthly metrics data
  const getCurrentMonthMetrics = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // zero-based
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const base = Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        tasksCompleted: 0,
        rulesBroken: 0,
        rewardsRedeemed: 0,
        punishments: 0,
      };
    });

    activityData.forEach((entry) => {
      const entryDate = new Date(entry.date);
      const label = `${entryDate.getMonth() + 1}/${entryDate.getDate()}`;
      const target = base.find((d) => d.date === label);
      if (target) {
        target.tasksCompleted += entry.tasksCompleted || 0;
        target.rulesBroken += entry.rulesBroken || 0;
        target.rewardsRedeemed += entry.rewardsRedeemed || 0;
        target.punishments += entry.punishments || 0;
      }
    });

    return base;
  };

  const monthlyMetrics = useMemo(() => getCurrentMonthMetrics(), []);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - chartScrollRef.current.offsetLeft);
    setScrollLeft(chartScrollRef.current.scrollLeft);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !chartScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - chartScrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    chartScrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const endDrag = () => setIsDragging(false);

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
  }, [onDataLoaded, weekDates]);

  const hasContent = data.some(d =>
    d.tasksCompleted || d.rulesBroken || d.rewardsRedeemed || d.punishments
  );

  // Memoize the weekly chart to prevent unnecessary re-renders
  const weeklyChart = useMemo(() => {
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
            <Tooltip 
              cursor={{ fill: 'transparent' }} // Fix #1 - completely transparent cursor
              wrapperStyle={{ zIndex: 9999 }}
              contentStyle={{ backgroundColor: 'transparent', border: 'none' }} // Fix #2 - transparent background
              offset={25} // Fix #3 - same offset as monthly chart
              formatter={(value, name, props) => {
                return [value, name];
              }}
              labelFormatter={(label) => {
                try {
                  return format(new Date(String(label)), 'MMM d, yyyy');
                } catch {
                  return label;
                }
              }}
            />
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
  }, [data, weekDates]);

  return (
    <Card className="bg-navy border border-light-navy rounded-lg mb-6">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Weekly Activity</h2>
        
        <div 
          className="w-full select-none" 
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          ref={chartScrollRef}
        >
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
