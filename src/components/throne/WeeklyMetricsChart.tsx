
import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { 
  format, parseISO, formatISO, addDays, startOfWeek 
} from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';

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

  const weekDates = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) =>
      format(addDays(start, i), 'yyyy-MM-dd')
    );
  }, []);

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

  return (
    <Card className="bg-navy border border-light-navy rounded-lg">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Weekly Activity</h2>
        
        <div className="w-full">
          {loading ? (
            <div className="w-full h-64 bg-light-navy/30 animate-pulse rounded" />
          ) : (
            <div style={{ width: '100%', height: 300, backgroundColor: '#0B1120', padding: '16px', borderRadius: '8px' }}>
              <BarChart width={600} height={300} data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
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
                  contentStyle={{ backgroundColor: 'transparent', border: 'none' }}
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
                <Bar
                  dataKey="tasksCompleted"
                  name="Tasks Completed"
                  fill={chartConfig.tasksCompleted.color}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
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
