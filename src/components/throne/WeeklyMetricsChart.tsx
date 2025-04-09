import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format, parseISO, addDays, startOfWeek, formatISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

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
  tasksCompleted: { color: '#0EA5E9', label: 'Tasks Completed' },
  rulesBroken: { color: '#F97316', label: 'Rules Broken' },
  rewardsRedeemed: { color: '#9b87f5', label: 'Rewards Redeemed' },
  punishments: { color: '#ea384c', label: 'Punishments' }
};

export const WeeklyMetricsChart: React.FC<WeeklyMetricsChartProps> = ({ onDataLoaded }) => {
  const [data, setData] = useState<MetricsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekDates = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'));
  }, []);

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 7);
      const isoStart = formatISO(weekStart);
      const isoEnd = formatISO(weekEnd);
  
      try {
        const [tasks, rules, rewards, punishments] = await Promise.all([
          supabase.from('task_completion_history').select('completed_at').gte('completed_at', isoStart).lt('completed_at', isoEnd),
          supabase.from('rule_violations').select('violation_date').gte('violation_date', isoStart).lt('violation_date', isoEnd),
          supabase.from('reward_usage').select('created_at').gte('created_at', isoStart).lt('created_at', isoEnd),
          supabase.from('punishment_history').select('applied_date').gte('applied_date', isoStart).lt('applied_date', isoEnd)
        ]);
  
        if (tasks.error || rules.error || rewards.error || punishments.error) {
          console.error('Supabase errors:', {
            tasks: tasks.error,
            rules: rules.error,
            rewards: rewards.error,
            punishments: punishments.error
          });
        }
  
        const safe = (res: any) => Array.isArray(res?.data) ? res.data : [];
  
        const metricsMap = new Map<string, MetricsData>();
        weekDates.forEach(date => {
          metricsMap.set(date, {
            date,
            tasksCompleted: 0,
            rulesBroken: 0,
            rewardsRedeemed: 0,
            punishments: 0
          });
        });
  
        safe(tasks).forEach(({ completed_at }) => {
          const date = format(parseISO(completed_at), 'yyyy-MM-dd');
          const entry = metricsMap.get(date);
          if (entry) entry.tasksCompleted += 1;
        });
  
        safe(rules).forEach(({ violation_date }) => {
          const date = format(parseISO(violation_date), 'yyyy-MM-dd');
          const entry = metricsMap.get(date);
          if (entry) entry.rulesBroken += 1;
        });
  
        safe(rewards).forEach(({ created_at }) => {
          const date = format(parseISO(created_at), 'yyyy-MM-dd');
          const entry = metricsMap.get(date);
          if (entry) entry.rewardsRedeemed += 1;
        });
  
        safe(punishments).forEach(({ applied_date }) => {
          const date = format(parseISO(applied_date), 'yyyy-MM-dd');
          const entry = metricsMap.get(date);
          if (entry) entry.punishments += 1;
        });
  
        const finalData = weekDates.map(d => metricsMap.get(d)!);
        setData(finalData);
  
        const summary = finalData.reduce<WeeklyMetricsSummary>(
          (acc, curr) => {
            acc.tasksCompleted += curr.tasksCompleted;
            acc.rulesBroken += curr.rulesBroken;
            acc.rewardsRedeemed += curr.rewardsRedeemed;
            acc.punishments += curr.punishments;
            return acc;
          },
          { tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 }
        );
  
        if (onDataLoaded) onDataLoaded(summary);
        setError(null);
      } catch (e: any) {
        console.error('Metrics fetch failed:', e);
        setError(`Error loading metrics: ${e.message}`);
        toast({
          title: "Error loading metrics",
          description: e.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
  
    loadMetrics();
  }, [onDataLoaded, weekDates]);

  const hasContent = data.some(d =>
    d.tasksCompleted > 0 || d.rulesBroken > 0 || d.rewardsRedeemed > 0 || d.punishments > 0
  );

  return (
    <Card className="bg-slate-900 text-white p-4 shadow-xl w-full">
      <h2 className="text-xl font-semibold mb-4">Weekly Activity</h2>
      <div className="w-full h-72 flex items-center justify-center">
        {loading ? (
          <span className="text-lg text-slate-300">Loading weekly metrics...</span>
        ) : data.some(
            (d) =>
              d.tasksCompleted > 0 ||
              d.rulesBroken > 0 ||
              d.rewardsRedeemed > 0 ||
              d.punishments > 0
          ) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis
                dataKey="date"
                ticks={weekDates}
                tickFormatter={(date) => {
                  try {
                    const [year, month, day] = date.split('-').map(Number);
                    return format(new Date(Date.UTC(year, month - 1, day)), 'EEE');
                  } catch {
                    return date;
                  }
                }}
                stroke="#8E9196"
                tick={{ fill: '#D1D5DB' }}
                interval={0}
              />
              <YAxis stroke="#8E9196" tick={{ fill: '#D1D5DB' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                labelFormatter={(label) => format(parseISO(label), 'EEEE')}
              />
              <Legend />
              <Bar dataKey="tasksCompleted" stackId="a" fill="#0ea5e9" name="Tasks Completed" />
              <Bar dataKey="rulesBroken" stackId="a" fill="#f97316" name="Rules Broken" />
              <Bar dataKey="rewardsRedeemed" stackId="a" fill="#8b5cf6" name="Rewards Redeemed" />
              <Bar dataKey="punishments" stackId="a" fill="#ef4444" name="Punishments" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <span className="text-lg text-slate-400">No activity recorded this week.</span>
        )}
      </div>
      <div className="flex justify-around mt-4 text-sm text-slate-400">
        <span className="text-sky-400">Tasks Completed</span>
        <span className="text-orange-400">Rules Broken</span>
        <span className="text-violet-400">Rewards Redeemed</span>
        <span className="text-red-400">Punishments</span>
      </div>
    </Card>
  );
};

export default WeeklyMetricsChart;
