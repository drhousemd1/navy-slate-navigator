
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import { 
  format, 
  parseISO,
  formatISO,
  addDays,
  startOfWeek
} from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateMondayBasedWeekDates } from '@/lib/utils';

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

export const WeeklyMetricsChart: React.FC<WeeklyMetricsChartProps> = ({ 
  onDataLoaded 
}) => {
  const [data, setData] = useState<MetricsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<WeeklyMetricsSummary>({
    tasksCompleted: 0,
    rulesBroken: 0,
    rewardsRedeemed: 0,
    punishments: 0
  });

  const weekDates = useMemo(() => generateMondayBasedWeekDates(), []);
  console.log('[WEEK DATES]', weekDates);

  useEffect(() => {
    const loadTaskCompletionsFromSupabase = async () => {
      try {
        setLoading(true);
        setError(null);

        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 7);
        const isoStart = formatISO(weekStart);
        const isoEnd = formatISO(weekEnd);

        const { data: completions, error: fetchError } = await supabase
          .from('task_completion_history')
          .select('completed_at')
          .gte('completed_at', isoStart)
          .lt('completed_at', isoEnd);

        console.log('[WEEK RANGE]', isoStart, '→', isoEnd);
        console.log('[COMPLETION DATA]', completions);

        if (fetchError) throw fetchError;

        const metricsMap = new Map<string, MetricsData>();
        weekDates.forEach((date) => {
          metricsMap.set(date, {
            date,
            tasksCompleted: 0,
            rulesBroken: 0,
            rewardsRedeemed: 0,
            punishments: 0,
          });
        });

        completions?.forEach(({ completed_at }) => {
          const date = format(parseISO(completed_at), 'yyyy-MM-dd');
          const target = metricsMap.get(date);
          if (target) {
            target.tasksCompleted += 1;
          }
        });

        const finalData = weekDates.map((d) => metricsMap.get(d)!);
        console.log('[FINAL DATA]', finalData);
        console.log('[FINAL DATA]', JSON.stringify(finalData, null, 2));
        setData(finalData);

        const summary = finalData.reduce(
          (acc, d) => ({
            tasksCompleted: acc.tasksCompleted + d.tasksCompleted,
            rulesBroken: acc.rulesBroken + d.rulesBroken,
            rewardsRedeemed: acc.rewardsRedeemed + d.rewardsRedeemed,
            punishments: acc.punishments + d.punishments,
          }),
          { tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 }
        );

        setSummaryData(summary);
        if (onDataLoaded) {
          console.log("[SUMMARY METRICS]", summary);
          onDataLoaded(summary);
        }
      } catch (err: any) {
        console.error('[WeeklyMetricsChart Error]', err);
        setError('Failed to load weekly metrics.');
      } finally {
        setLoading(false);
      }
    };

    loadTaskCompletionsFromSupabase();
  }, [onDataLoaded, weekDates]);

  const hasContent = data.some(d =>
    d.tasksCompleted > 0 || d.rulesBroken > 0 || d.rewardsRedeemed > 0 || d.punishments > 0
  );

  return (
    <Card className="bg-navy border border-light-navy rounded-lg">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Weekly Activity</h2>
        
        <div className="w-full">
          {loading ? (
            <Skeleton className="w-full h-64 bg-light-navy/30" />
          ) : (
            <div className="h-64">
              {!hasContent ? (
                <div className="flex items-center justify-center h-full text-white text-sm">
                  No activity data to display for this week.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={256}>
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1A1F2C" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => format(parseISO(date), 'EEE')}
                      interval={0}
                      stroke="#8E9196"
                      tick={{ fill: '#D1D5DB' }}
                    />
                    <YAxis stroke="#8E9196" tick={{ fill: '#D1D5DB' }} />
                    <Tooltip
                      cursor={false}
                      wrapperStyle={{ zIndex: 9999 }}
                      contentStyle={{ backgroundColor: '#1A1F2C', border: '1px solid #2A2F3C', borderRadius: '4px' }}
                      formatter={(value, name) => [`${value}`, name]}
                      labelFormatter={(label) => format(parseISO(label), 'EEEE, MMM d')}
                    />
                    <Bar
                      dataKey="tasksCompleted"
                      name="Tasks Completed"
                      fill={chartConfig.tasksCompleted.color}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
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
