import React, { useRef, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  format, eachDayOfInterval, startOfMonth, endOfMonth
} from 'date-fns';
import { Card } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import MonthlyMetricsSummaryTiles from './MonthlyMetricsSummaryTiles';

interface MonthlyDataItem {
  date: string;
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

export interface MonthlyMetricsSummary {
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

const fetchMonthlyData = async (): Promise<MonthlyDataItem[]> => {
  const start = startOfMonth(new Date());
  const end = endOfMonth(new Date());
  const startDate = start.toISOString();
  const endDate = end.toISOString();

  const days = eachDayOfInterval({ start, end });
  const formatDate = (d: Date) => format(d, 'yyyy-MM-dd');

  const daily: Record<string, MonthlyDataItem> = {};
  for (const day of days) {
    const key = formatDate(day);
    daily[key] = {
      date: key,
      tasksCompleted: 0,
      rulesBroken: 0,
      rewardsRedeemed: 0,
      punishments: 0,
    };
  }

  const [{ data: tasks }, { data: rules }, { data: rewards }, { data: punishments }] = await Promise.all([
    supabase.from('task_completion_history').select('completed_at').gte('completed_at', startDate).lte('completed_at', endDate),
    supabase.from('rule_violations').select('violation_date').gte('violation_date', startDate).lte('violation_date', endDate),
    supabase.from('reward_usage').select('created_at').gte('created_at', startDate).lte('created_at', endDate),
    supabase.from('punishment_history').select('applied_date').gte('applied_date', startDate).lte('applied_date', endDate),
  ]);

  const countInto = (rows: any[] | null | undefined, field: keyof MonthlyDataItem, dateField: string) => {
    rows?.forEach(row => {
      const key = formatDate(new Date(row[dateField]));
      if (daily[key]) daily[key][field]++;
    });
  };

  countInto(tasks, 'tasksCompleted', 'completed_at');
  countInto(rules, 'rulesBroken', 'violation_date');
  countInto(rewards, 'rewardsRedeemed', 'created_at');
  countInto(punishments, 'punishments', 'applied_date');

  return Object.values(daily);
};

const MonthlyMetricsChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const { data = [] } = useQuery({
    queryKey: ['monthly-metrics'],
    queryFn: fetchMonthlyData,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });

  const monthlySummary = useMemo<MonthlyMetricsSummary>(() => {
    return data.reduce(
      (acc, day) => {
        acc.tasksCompleted += day.tasksCompleted;
        acc.rulesBroken += day.rulesBroken;
        acc.rewardsRedeemed += day.rewardsRedeemed;
        acc.punishments += day.punishments;
        return acc;
      },
      {
        tasksCompleted: 0,
        rulesBroken: 0,
        rewardsRedeemed: 0,
        punishments: 0,
      }
    );
  }, [data]);

  const chartConfig = {
    tasksCompleted: { color: '#0EA5E9', label: 'Tasks Completed' },
    rulesBroken: { color: '#F97316', label: 'Rules Broken' },
    rewardsRedeemed: { color: '#9b87f5', label: 'Rewards Redeemed' },
    punishments: { color: '#ef4444', label: 'Punishments' },
  };

  return (
    <Card className="w-full p-4">
      <h2 className="text-xl font-semibold mb-4">Monthly Activity</h2>
      <ChartContainer
        config={chartConfig}
        ref={chartContainerRef}
        scrollRef={chartScrollRef}
        isDragging={isDragging}
        setIsDragging={setIsDragging}
        startX={startX}
        setStartX={setStartX}
        scrollLeft={scrollLeft}
        setScrollLeft={setScrollLeft}
      >
        <ResponsiveContainer width={data.length * 30 || 300} height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            {Object.entries(chartConfig).map(([key, { color, label }]) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                fill={color}
                name={label}
                isAnimationActive={false}
                hide={(data.every(d => d[key as keyof MonthlyDataItem] === 0))}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
      <MonthlyMetricsSummaryTiles summary={monthlySummary} />
    </Card>
  );
};

export default MonthlyMetricsChart;