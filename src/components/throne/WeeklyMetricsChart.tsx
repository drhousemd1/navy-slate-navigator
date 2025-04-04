
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ChartData {
  name: string;
  tasksCompleted: number;
  rulesViolated: number;
  rewardsUsed: number;
  punishmentsApplied: number;
  day: number;
  date: string;
  isToday: boolean;
}

interface TaskCompletionData {
  completion_date: string;
  completion_count: number;
}

interface WeeklyMetricsChartProps {
  hideTitle?: boolean;
  onDataLoaded?: (summary: {
    tasksCompleted: number;
    rulesViolated: number;
    rewardsUsed: number;
    punishmentsApplied: number;
  }) => void;
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
          {payload.map((entry) => {
            let label = '';
            let suffix = '';
            
            switch(entry.name) {
              case 'tasksCompleted':
                label = 'Tasks';
                suffix = 'completed';
                break;
              case 'rulesViolated':
                label = 'Rule Violations';
                suffix = '';
                break;
              case 'rewardsUsed':
                label = 'Rewards';
                suffix = 'used';
                break;
              case 'punishmentsApplied':
                label = 'Punishments';
                suffix = 'applied';
                break;
              default:
                label = entry.name || '';
            }
            
            return (
              <p
                key={entry.name}
                className="text-sm"
                style={{ color: entry.color }}
              >
                {label}: {entry.value} {suffix}
              </p>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

const WeeklyMetricsChart: React.FC<WeeklyMetricsChartProps> = ({ 
  hideTitle = false,
  onDataLoaded
}) => {
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
          tasksCompleted: 0,
          rulesViolated: 0,
          rewardsUsed: 0,
          punishmentsApplied: 0,
          day: i,
          date: format(date, 'yyyy-MM-dd'),
          isToday: isToday(date),
        };
      });
      
      console.log('Generated week days:', initialData);

      // Fetch task completions for the week
      try {
        const { data: taskCompletions, error: taskError } = await supabase.rpc(
          'get_task_completions_for_week',
          { week_start: weekStart.toISOString() }
        );

        if (taskError) {
          console.error('Error fetching task completion history:', taskError);
        } else if (taskCompletions) {
          (taskCompletions as TaskCompletionData[]).forEach(item => {
            const dateObj = new Date(item.completion_date);
            const dayOfWeek = dateObj.getDay();
            const dayData = initialData.find(d => d.day === dayOfWeek);
            if (dayData) {
              dayData.tasksCompleted = Number(item.completion_count);
            }
          });
          console.log('Task completions fetched:', taskCompletions.length);
        }
      } catch (error) {
        console.error('Error fetching task completions:', error);
      }

      // Fetch rule violations for the week
      try {
        const weekNumber = format(today, 'yyyy-ww');
        const { data: ruleViolations, error: ruleError } = await supabase
          .from('rule_violations')
          .select('*')
          .eq('week_number', weekNumber);

        if (ruleError) {
          console.error('Error fetching rule violations:', ruleError);
        } else if (ruleViolations) {
          ruleViolations.forEach(violation => {
            const dayOfWeek = violation.day_of_week;
            const dayData = initialData.find(d => d.day === dayOfWeek);
            if (dayData) {
              dayData.rulesViolated += 1;
            }
          });
        }
      } catch (error) {
        console.error('Error fetching rule violations:', error);
      }

      // Fetch rewards usage for the week
      try {
        const weekStart = startOfWeek(today).toISOString();
        const weekEnd = addDays(weekStart, 7).toISOString();
        
        // Changed from 'reward_uses' to 'reward_usage' to match the database schema
        const { data: rewardsUsage, error: rewardsError } = await supabase
          .from('reward_usage')
          .select('*')
          .gte('created_at', weekStart)
          .lt('created_at', weekEnd);
          
        if (rewardsError) {
          console.error('Error fetching rewards usage:', rewardsError);
        } else if (rewardsUsage) {
          rewardsUsage.forEach(usage => {
            // Using created_at instead of used_at as per schema
            const usageDate = new Date(usage.created_at);
            const dayOfWeek = usageDate.getDay();
            const dayData = initialData.find(d => d.day === dayOfWeek);
            if (dayData) {
              dayData.rewardsUsed += 1;
            }
          });
        }
      } catch (error) {
        console.error('Error fetching rewards usage:', error);
      }

      // Fetch punishments applied for the week
      try {
        const weekStart = startOfWeek(today).toISOString();
        const weekEnd = addDays(weekStart, 7).toISOString();
        
        const { data: punishments, error: punishmentsError } = await supabase
          .from('punishment_history')
          .select('*')
          .gte('applied_date', weekStart)
          .lt('applied_date', weekEnd);
          
        if (punishmentsError) {
          console.error('Error fetching punishments:', punishmentsError);
        } else if (punishments) {
          punishments.forEach(punishment => {
            // Using applied_date instead of applied_at as per schema
            const punishmentDate = new Date(punishment.applied_date);
            const dayOfWeek = punishmentDate.getDay();
            const dayData = initialData.find(d => d.day === dayOfWeek);
            if (dayData) {
              dayData.punishmentsApplied += 1;
            }
          });
        }
      } catch (error) {
        console.error('Error fetching punishments:', error);
      }

      console.log('Chart data to render:', initialData);
      setData(initialData);
      
      // Calculate totals for the week to pass to parent component
      if (onDataLoaded) {
        const weeklyTotals = {
          tasksCompleted: initialData.reduce((sum, day) => sum + day.tasksCompleted, 0),
          rulesViolated: initialData.reduce((sum, day) => sum + day.rulesViolated, 0),
          rewardsUsed: initialData.reduce((sum, day) => sum + day.rewardsUsed, 0),
          punishmentsApplied: initialData.reduce((sum, day) => sum + day.punishmentsApplied, 0)
        };
        onDataLoaded(weeklyTotals);
      }
      
      console.log('Final chart data:', initialData);
    } catch (error) {
      console.error('Error preparing chart data:', error);
    } finally {
      console.log('Loading state:', false);
      setLoading(false);
    }
  }, [onDataLoaded]);

  useEffect(() => {
    console.log('Fetching metrics data...');
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
              dataKey="tasksCompleted"
              name="Tasks"
              fill="#4ADE80"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="rulesViolated"
              name="Rule Violations"
              fill="#F87171"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="rewardsUsed"
              name="Rewards"
              fill="#A78BFA"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="punishmentsApplied"
              name="Punishments"
              fill="#FB7185"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default WeeklyMetricsChart;
