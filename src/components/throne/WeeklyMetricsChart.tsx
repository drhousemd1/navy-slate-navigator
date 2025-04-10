import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  format, getMonth, getDaysInMonth, eachDayOfInterval, startOfMonth, endOfMonth, parseISO
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
    punishments: { color: '#ea384c', label: 'Punishments' }
  };

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['monthly-metrics'] });
  }, [queryClient]);

  const generateMonthDays = (): string[] => {
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    return eachDayOfInterval({ start, end }).map(date => format(date, 'yyyy-MM-dd'));
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'MMM d');
    } catch {
      return dateString;
    }
  };

  const monthDates = useMemo(() => generateMonthDays(), []);

  const BAR_WIDTH = 6;
  const BAR_COUNT = 4;
  const BAR_GAP = 2;
  const GROUP_PADDING = 10;
  const CHART_PADDING = 20;

  const dayWidth = (BAR_WIDTH * BAR_COUNT) + (BAR_COUNT - 1) * BAR_GAP + GROUP_PADDING;
  const chartWidth = Math.max(monthDates.length * dayWidth + CHART_PADDING * 2, 900);

  const fetchMonthlyData = async (): Promise<{
    dataArray: MonthlyDataItem[];
    monthlyTotals: MonthlyMetricsSummary;
  }> => {
    try {
      const metrics = new Map<string, MonthlyDataItem>();
      monthDates.forEach(date => {
        metrics.set(date, {
          date,
          tasksCompleted: 0,
          rulesBroken: 0,
          rewardsRedeemed: 0,
          punishments: 0
        });
      });

      const today = new Date();
      const start = startOfMonth(today);
      const end = endOfMonth(today);

      const [{ data: tasks }, { data: rules }, { data: rewards }, { data: punishments }] = await Promise.all([
        supabase.from('task_completion_history').select('completed_at').gte('completed_at', start.toISOString()).lte('completed_at', end.toISOString()),
        supabase.from('rule_violations').select('violation_date').gte('violation_date', start.toISOString()).lte('violation_date', end.toISOString()),
        supabase.from('reward_usage').select('created_at').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
        supabase.from('punishment_history').select('applied_date').gte('applied_date', start.toISOString()).lte('applied_date', end.toISOString()),
      ]);

      tasks?.forEach(entry => {
        const key = format(new Date(entry.completed_at), 'yyyy-MM-dd');
        if (metrics.has(key)) metrics.get(key)!.tasksCompleted++;
      });

      rules?.forEach(entry => {
        const key = format(new Date(entry.violation_date), 'yyyy-MM-dd');
        if (metrics.has(key)) metrics.get(key)!.rulesBroken++;
      });

      rewards?.forEach(entry => {
        const key = format(new Date(entry.created_at), 'yyyy-MM-dd');
        if (metrics.has(key)) metrics.get(key)!.rewardsRedeemed++;
      });

      punishments?.forEach(entry => {
        const key = format(new Date(entry.applied_date), 'yyyy-MM-dd');
        if (metrics.has(key)) metrics.get(key)!.punishments++;
      });

      const result = Array.from(metrics.values());

      const totals: MonthlyMetricsSummary = {
        tasksCompleted: result.reduce((sum, d) => sum + (d.tasksCompleted ?? 0), 0),
        rulesBroken: result.reduce((sum, d) => sum + (d.rulesBroken ?? 0), 0),
        rewardsRedeemed: result.reduce((sum, d) => sum + (d.rewardsRedeemed ?? 0), 0),
        punishments: result.reduce((sum, d) => sum + (d.punishments ?? 0), 0)
      };

      return { dataArray: result, monthlyTotals: totals };
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch monthly activity data',
        variant: 'destructive'
      });
      return {
        dataArray: [],
        monthlyTotals: {
          tasksCompleted: 0,
          rulesBroken: 0,
          rewardsRedeemed: 0,
          punishments: 0
        }
      };
    }
  };

  const { data: response = { dataArray: [], monthlyTotals: { tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 } }, isLoading, refetch } = useQuery({
    queryKey: ['monthly-metrics'],
    queryFn: fetchMonthlyData,
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
    staleTime: 0,
    gcTime: 0
  });

  const { dataArray, monthlyTotals } = response;

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
        <ResponsiveContainer width={chartWidth} height={300}>
          <BarChart data={dataArray}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatDate} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            {Object.entries(chartConfig).map(([key, { color, label }]) => (
              <Bar key={key} dataKey={key} fill={color} name={label} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
      <MonthlyMetricsSummaryTiles summary={monthlyTotals} />
    </Card>
  );
};

export default MonthlyMetricsChart;