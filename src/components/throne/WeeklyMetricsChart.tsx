
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ChartData {
  name: string;
  tasks: number;
  rules: number;
  day: number;
  date: string;
  isToday: boolean;
}

interface TaskCompletionData {
  completion_date: string;
  completion_count: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-navy p-3 border border-light-navy rounded shadow-lg">
        <p className="text-white font-bold">{label}</p>
        <div className="mt-2">
          {payload.map((entry) => (
            <p
              key={entry.name}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}: {entry.value} {entry.name === 'Tasks' ? 'completed' : 'violations'}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

const WeeklyMetricsChart: React.FC = () => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  const prepareChartData = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date();
      const weekStart = startOfWeek(today);
      
      // Initialize data structure for all days of the week
      const initialData: ChartData[] = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        return {
          name: DAYS_OF_WEEK[i],
          tasks: 0,
          rules: 0,
          day: i,
          date: format(date, 'yyyy-MM-dd'),
          isToday: isToday(date),
        };
      });

      // Fetch task completions for the week
      const { data: taskCompletions, error: taskError } = await supabase.rpc(
        'get_task_completions_for_week',
        { week_start: weekStart.toISOString() }
      );

      if (taskError) {
        console.error('Error fetching task completions:', taskError);
      }

      // Process task completions
      if (taskCompletions) {
        (taskCompletions as TaskCompletionData[]).forEach(item => {
          const dateObj = new Date(item.completion_date);
          const dayOfWeek = dateObj.getDay();
          const dayData = initialData.find(d => d.day === dayOfWeek);
          if (dayData) {
            dayData.tasks = Number(item.completion_count);
          }
        });
      }

      // Fetch rule violations for the week
      const weekNumber = format(today, 'yyyy-ww');
      const { data: ruleViolations, error: ruleError } = await supabase
        .from('rule_violations')
        .select('day_of_week, count')
        .eq('week_number', weekNumber)
        .select();

      if (ruleError) {
        console.error('Error fetching rule violations:', ruleError);
      }

      // Process rule violations
      if (ruleViolations) {
        // Group violations by day of week and count them
        const violationsByDay: Record<number, number> = {};
        
        ruleViolations.forEach(violation => {
          const dayOfWeek = violation.day_of_week;
          violationsByDay[dayOfWeek] = (violationsByDay[dayOfWeek] || 0) + 1;
        });
        
        // Update the chart data with the violation counts
        Object.entries(violationsByDay).forEach(([day, count]) => {
          const dayIndex = parseInt(day);
          const dayData = initialData.find(d => d.day === dayIndex);
          if (dayData) {
            dayData.rules = count as number;
          }
        });
      }

      setData(initialData);
    } catch (error) {
      console.error('Error preparing chart data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    prepareChartData();
  }, [prepareChartData]);

  return (
    <div className="h-64 mt-6">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-white text-center">Loading activity data...</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fill: '#FFFFFF' }}
              axisLine={{ stroke: '#1E293B' }}
              tickLine={{ stroke: '#1E293B' }}
            />
            <YAxis
              tick={{ fill: '#FFFFFF' }}
              axisLine={{ stroke: '#1E293B' }}
              tickLine={{ stroke: '#1E293B' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="tasks"
              name="Tasks"
              fill="#4ADE80"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="rules"
              name="Rule Violations"
              fill="#F87171"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default WeeklyMetricsChart;
