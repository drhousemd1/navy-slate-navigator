import React, { useRef, useState, useMemo } from 'react';
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
import { useQuery } from '@tanstack/react-query';

interface MonthlyDataItem {
  date: string;
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

interface MonthlyMetricsSummary {
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

const MonthlyMetricsChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const chartConfig = {
    tasksCompleted: { color: '#0EA5E9', label: 'Tasks Completed' },
    rulesBroken: { color: '#F97316', label: 'Rules Broken' },
    rewardsRedeemed: { color: '#9b87f5', label: 'Rewards Redeemed' },
    punishments: { color: '#ea384c', label: 'Punishments' }
  };

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
        supabase.from('punishment_history').select('applied_date').gte('applied_date', start.toISOString()).lte('applied_date', end.toISOString())
      ]);

      tasks?.forEach(({ completed_at }) => {
        const date = format(parseISO(completed_at), 'yyyy-MM-dd');
        const day = metrics.get(date);
        if (day) day.tasksCompleted++;
      });

      rules?.forEach(({ violation_date }) => {
        const date = format(parseISO(violation_date), 'yyyy-MM-dd');
        const day = metrics.get(date);
        if (day) day.rulesBroken++;
      });

      rewards?.forEach(({ created_at }) => {
        const date = format(parseISO(created_at), 'yyyy-MM-dd');
        const day = metrics.get(date);
        if (day) day.rewardsRedeemed++;
      });

      punishments?.forEach(({ applied_date }) => {
        const date = format(parseISO(applied_date), 'yyyy-MM-dd');
        const day = metrics.get(date);
        if (day) day.punishments++;
      });

      const dataArray = Array.from(metrics.values());
      const monthlyTotals = dataArray.reduce<MonthlyMetricsSummary>((totals, item) => {
        totals.tasksCompleted += item.tasksCompleted;
        totals.rulesBroken += item.rulesBroken;
        totals.rewardsRedeemed += item.rewardsRedeemed;
        totals.punishments += item.punishments;
        return totals;
      }, { tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 });

      return { dataArray, monthlyTotals };
    } catch (error) {
      toast({ title: 'Error loading monthly data', description: `${error}` });
      throw error;
    }
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['monthly-metrics'],
    queryFn: fetchMonthlyData
  });

  return (
    <Card className="bg-slate-900">
      <ChartContainer
        title="Monthly Activity"
        chartWidth={chartWidth}
        chartContainerRef={chartContainerRef}
        chartScrollRef={chartScrollRef}
      >
        {/* Chart Rendering Logic */}
      </ChartContainer>
      <MonthlyMetricsSummaryTiles summary={data?.monthlyTotals || {
        tasksCompleted: 0,
        rulesBroken: 0,
        rewardsRedeemed: 0,
        punishments: 0
      }} />
    </Card>
  );
};

export default MonthlyMetricsChart;