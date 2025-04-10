
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { generateMondayBasedWeekDates } from '@/lib/utils';

interface WeeklyDataItem {
  date: string;
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

const WeeklyMetricsChart: React.FC = () => {
  const [data, setData] = useState<WeeklyDataItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Configure chart colors
  const chartConfig = {
    tasksCompleted: { color: '#0EA5E9', label: 'Tasks Completed' },
    rulesBroken: { color: '#F97316', label: 'Rules Broken' },
    rewardsRedeemed: { color: '#9b87f5', label: 'Rewards Redeemed' },
    punishments: { color: '#ea384c', label: 'Punishments' }
  };

  // Fetch weekly data
  useEffect(() => {
    const fetchWeeklyData = async () => {
      try {
        setLoading(true);
        
        // Generate all days of the week (Monday to Sunday)
        const weekDays = generateMondayBasedWeekDates();
        
        // Initialize data structure with all days, starting with zero values
        const metricsMap = new Map<string, WeeklyDataItem>();
        weekDays.forEach(date => {
          metricsMap.set(date, {
            date,
            tasksCompleted: 0,
            rulesBroken: 0,
            rewardsRedeemed: 0,
            punishments: 0
          });
        });

        // Get current week date range
        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 }); // Start on Monday
        const end = endOfWeek(today, { weekStartsOn: 1 }); // End on Sunday
        
        // Fetch task completions
        const { data: taskCompletions, error: taskError } = await supabase
          .from('task_completion_history')
          .select('*')
          .gte('completed_at', start.toISOString())
          .lte('completed_at', end.toISOString());
        
        if (taskError) {
          console.error('Error fetching task completions:', taskError);
        } else {
          taskCompletions?.forEach(entry => {
            const date = format(new Date(entry.completed_at), 'yyyy-MM-dd');
            if (metricsMap.has(date)) {
              metricsMap.get(date)!.tasksCompleted++;
            }
          });
        }

        // Fetch rule violations
        const { data: ruleViolations, error: ruleError } = await supabase
          .from('rule_violations')
          .select('*')
          .gte('violation_date', start.toISOString())
          .lte('violation_date', end.toISOString());
        
        if (ruleError) {
          console.error('Error fetching rule violations:', ruleError);
        } else {
          ruleViolations?.forEach(entry => {
            const date = format(new Date(entry.violation_date), 'yyyy-MM-dd');
            if (metricsMap.has(date)) {
              metricsMap.get(date)!.rulesBroken++;
            }
          });
        }

        // Fetch reward usages
        const { data: rewardUsages, error: rewardError } = await supabase
          .from('reward_usage')
          .select('*')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
        
        if (rewardError) {
          console.error('Error fetching reward usages:', rewardError);
        } else {
          rewardUsages?.forEach(entry => {
            const date = format(new Date(entry.created_at), 'yyyy-MM-dd');
            if (metricsMap.has(date)) {
              metricsMap.get(date)!.rewardsRedeemed++;
            }
          });
        }

        // Fetch punishments
        const { data: punishments, error: punishmentError } = await supabase
          .from('punishment_history')
          .select('*')
          .gte('applied_date', start.toISOString())
          .lte('applied_date', end.toISOString());
        
        if (punishmentError) {
          console.error('Error fetching punishments:', punishmentError);
        } else {
          punishments?.forEach(entry => {
            const date = format(new Date(entry.applied_date), 'yyyy-MM-dd');
            if (metricsMap.has(date)) {
              metricsMap.get(date)!.punishments++;
            }
          });
        }

        // Convert map to sorted array
        const sortedData = Array.from(metricsMap.values())
          .sort((a, b) => a.date.localeCompare(b.date));
        
        setData(sortedData);
      } catch (error) {
        console.error('Error fetching weekly data:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch weekly activity data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyData();
  }, []);

  const hasData = data.some(d => 
    d.tasksCompleted > 0 || d.rulesBroken > 0 || d.rewardsRedeemed > 0 || d.punishments > 0
  );

  return (
    <Card className="bg-navy border border-light-navy rounded-lg">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Weekly Activity</h2>
        <div className="h-60">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-full h-full bg-light-navy/30 animate-pulse rounded"></div>
            </div>
          ) : !hasData ? (
            <div className="flex items-center justify-center h-full text-white">
              No activity data to display for this week
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data} 
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="0" stroke="#1A1F2C" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#D1D5DB' }} 
                  stroke="#8E9196"
                  tickFormatter={(date) => {
                    try {
                      return format(parseISO(date), 'EEE');
                    } catch {
                      return date;
                    }
                  }}
                />
                <YAxis 
                  tick={{ fill: '#D1D5DB' }} 
                  stroke="#8E9196"
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(30, 41, 59, 0.4)' }}
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
                  labelStyle={{ color: '#F8FAFC' }}
                  labelFormatter={(label) => {
                    try {
                      return format(parseISO(String(label)), 'EEEE, MMM d');
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
