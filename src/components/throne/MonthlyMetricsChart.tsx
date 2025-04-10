import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  format, eachDayOfInterval, startOfMonth, endOfMonth
} from 'date-fns';
import { Card } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import MonthlyMetricsSummaryTiles from './MonthlyMetricsSummaryTiles';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  const startDate = startOfMonth(new Date()).toISOString();
  const endDate = endOfMonth(new Date()).toISOString();
  const daysInMonth = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) });

  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');

  const [{ data: tasks }, { data: rules }, { data: rewards }, { data: punishments }] = await Promise.all([
    supabase.from('task_completion_history').select('created_at').gte('created_at', startDate).lte('created_at', endDate),
    supabase.from('rule_violations').select('created_at').gte('created_at', startDate).lte('created_at', endDate),
    supabase.from('reward_usage').select('created_at').gte('created_at', startDate).lte('created_at', endDate),
    supabase.from('punishment_history').select('created_at').gte('created_at', startDate).lte('created_at', endDate)
  ]);

  const activityMap: Record<string, MonthlyDataItem> = {};

  for (const day of daysInMonth) {
    const key = formatDate(day);
    activityMap[key] = {
      date: key,
      tasksCompleted: 0,
      rulesBroken: 0,
      rewardsRedeemed: 0,
      punishments: 0,
    };
  }

  const incrementCounts = (items: any[], field: keyof MonthlyDataItem) => {
    items?.forEach(({ created_at }) => {
      const dateKey = formatDate(new Date(created_at));
      if (activityMap[dateKey]) {
        activityMap[dateKey][field]++;
      }
    });
  };

  incrementCounts(tasks || [], 'tasksCompleted');
  incrementCounts(rules || [], 'rulesBroken');
  incrementCounts(rewards || [], 'rewardsRedeemed');
  incrementCounts(punishments || [], 'punishments');

  return Object.values(activityMap);
};

const MonthlyMetricsChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const chartConfig = {
    tasksCompleted: { color: '#0EA5E9', label: 'Tasks Completed' },
    rulesBroken: { color: '#F97316', label: 'Rules Broken' },
    rewardsRedeemed: { color: '#9b87f5', label: 'Rewards Redeemed' },
    punishments: { color: '#ef4444', label: 'Punishments' },
  };

  const { data = [], isLoading } = useQuery({
    queryKey: ['monthly-metrics'],
    queryFn: fetchMonthlyData,
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
  });

  const monthlySummary = useMemo<MonthlyMetricsSummary>(() => {
    return data.reduce((acc, item) => {
      acc.tasksCompleted += item.tasksCompleted;
      acc.rulesBroken += item.rulesBroken;
      acc.rewardsRedeemed += item.rewardsRedeemed;
      acc.punishments += item.punishments;
      return acc;
    }, {
      tasksCompleted: 0,
      rulesBroken: 0,
      rewardsRedeemed: 0,
      punishments: 0,
    });
  }, [data]);

  return (
    <Card className="w-full p-4">
      <h2 className="text-xl font-semibold mb-4">Monthly Activity</h2>
      <ChartContainer
        ref={chartContainerRef}
        scrollRef={chartScrollRef}
        isDragging={isDragging}
        setIsDragging={setIsDragging}
        startX={startX}
        setStartX={setStartX}
        scrollLeft={scrollLeft}
        setScrollLeft={setScrollLeft}
      >
        <ResponsiveContainer width={data.length * 60} height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            {Object.entries(chartConfig).map(([key, { color, label }]) => (
              <Bar key={key} dataKey={key} stackId="a" fill={color} name={label} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
      <MonthlyMetricsSummaryTiles summary={monthlySummary} />
    </Card>
  );
};

export default MonthlyMetricsChart;
