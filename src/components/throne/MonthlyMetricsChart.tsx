
import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps
} from 'recharts';
import { format, getMonth, getYear, getDaysInMonth, eachDayOfInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { supabase } from '@/integrations/supabase/client';

interface MonthlyDataItem {
  date: string;
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

const MonthlyMetricsChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<MonthlyDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  // Generate month days for the current month
  const generateMonthDays = (): string[] => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    
    const monthDates = eachDayOfInterval({ 
      start: monthStart, 
      end: monthEnd 
    }).map(date => format(date, 'yyyy-MM-dd'));
    
    return monthDates;
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'MMM d');
    } catch {
      return dateString;
    }
  };

  // Get the month dates once
  const monthDates = useMemo(() => generateMonthDays(), []);

  useEffect(() => {
    const loadMonthlyData = async () => {
      try {
        setLoading(true);
        
        const metricsMap = new Map<string, MonthlyDataItem>();

        // Initialize data for each day of the month
        monthDates.forEach((date) => {
          metricsMap.set(date, {
            date,
            tasksCompleted: 0,
            rulesBroken: 0,
            rewardsRedeemed: 0,
            punishments: 0
          });
        });

        // Get the first day of the current month
        const today = new Date();
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);

        // Fetch task completions for the month
        const { data: taskCompletions, error: taskError } = await supabase
          .from('task_completion_history')
          .select('*')
          .gte('completed_at', monthStart.toISOString())
          .lte('completed_at', monthEnd.toISOString());

        if (taskError) {
          console.error('Error fetching task completions:', taskError);
        } else if (taskCompletions) {
          // Group task completions by date
          taskCompletions.forEach((completion) => {
            const completionDate = format(new Date(completion.completed_at), 'yyyy-MM-dd');
            if (metricsMap.has(completionDate)) {
              const dayData = metricsMap.get(completionDate)!;
              dayData.tasksCompleted++;
            }
          });
        }

        // Fetch rule violations for the month
        const { data: ruleViolations, error: ruleError } = await supabase
          .from('rule_violations')
          .select('*')
          .gte('violation_date', monthStart.toISOString())
          .lte('violation_date', monthEnd.toISOString());

        if (ruleError) {
          console.error('Error fetching rule violations:', ruleError);
        } else if (ruleViolations) {
          // Group rule violations by date
          ruleViolations.forEach((violation) => {
            const violationDate = format(new Date(violation.violation_date), 'yyyy-MM-dd');
            if (metricsMap.has(violationDate)) {
              const dayData = metricsMap.get(violationDate)!;
              dayData.rulesBroken++;
            }
          });
        }

        // Fetch reward usage for the month
        const { data: rewardUsage, error: rewardError } = await supabase
          .from('reward_usage')
          .select('*')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        if (rewardError) {
          console.error('Error fetching reward usage:', rewardError);
        } else if (rewardUsage) {
          // Group reward usage by date
          rewardUsage.forEach((usage) => {
            const usageDate = format(new Date(usage.created_at), 'yyyy-MM-dd');
            if (metricsMap.has(usageDate)) {
              const dayData = metricsMap.get(usageDate)!;
              dayData.rewardsRedeemed++;
            }
          });
        }

        // Fetch punishment history for the month
        const { data: punishmentHistory, error: punishmentError } = await supabase
          .from('punishment_history')
          .select('*')
          .gte('applied_date', monthStart.toISOString())
          .lte('applied_date', monthEnd.toISOString());

        if (punishmentError) {
          console.error('Error fetching punishment history:', punishmentError);
        } else if (punishmentHistory) {
          // Group punishment history by date
          punishmentHistory.forEach((punishment) => {
            const punishmentDate = format(new Date(punishment.applied_date), 'yyyy-MM-dd');
            if (metricsMap.has(punishmentDate)) {
              const dayData = metricsMap.get(punishmentDate)!;
              dayData.punishments++;
            }
          });
        }

        const finalData = Array.from(metricsMap.values());
        console.log("[MONTHLY METRICS DATA]", finalData);
        
        setData(finalData);
      } catch (err: any) {
        console.error('[Monthly Chart error]', err);
      } finally {
        setLoading(false);
      }
    };

    loadMonthlyData();
  }, [monthDates]);

  const handleBarClick = (data: any, index: number) => {
    if (!chartContainerRef.current) return;
    
    const container = chartContainerRef.current;
    const barWidth = 40;  // approximate bar width
    const scrollTo = (index * barWidth) - (container.clientWidth / 2) + barWidth;
    
    container.scrollTo({
      left: Math.max(scrollTo, 0),
      behavior: 'smooth'
    });
  };

  const hasContent = data.some(d =>
    d.tasksCompleted || d.rulesBroken || d.rewardsRedeemed || d.punishments
  );

  // Memoize the monthly chart to prevent unnecessary re-renders
  const monthlyChart = useMemo(() => {
    return (
      <ChartContainer 
        className="w-full h-full"
        config={chartConfig}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1F2C" />
            <XAxis 
              dataKey="date"
              tickFormatter={(date) => {
                try {
                  const d = parseISO(date);
                  return `${getMonth(d) + 1}/${format(d, 'd')}`;
                } catch {
                  return date;
                }
              }}
              stroke="#8E9196"
              tick={{ fill: '#D1D5DB' }}
            />
            <YAxis 
              stroke="#8E9196"
              tick={{ fill: '#D1D5DB' }}
            />
            <Tooltip 
              formatter={(value, name, props) => {
                // Safe type checking for values
                return [value, name];
              }}
              labelFormatter={(label) => {
                try {
                  return format(parseISO(String(label)), 'MMM d, yyyy');
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
              onClick={handleBarClick}
            />
            <Bar 
              dataKey="rulesBroken" 
              name="Rules Broken" 
              fill={chartConfig.rulesBroken.color} 
              radius={[4, 4, 0, 0]} 
              onClick={handleBarClick}
            />
            <Bar 
              dataKey="rewardsRedeemed" 
              name="Rewards Redeemed" 
              fill={chartConfig.rewardsRedeemed.color} 
              radius={[4, 4, 0, 0]} 
              onClick={handleBarClick}
            />
            <Bar 
              dataKey="punishments" 
              name="Punishments" 
              fill={chartConfig.punishments.color} 
              radius={[4, 4, 0, 0]} 
              onClick={handleBarClick}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  }, [data]);

  return (
    <Card className="bg-navy border border-light-navy rounded-lg mb-6">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Monthly Activity</h2>
        
        <div 
          ref={chartContainerRef}
          className="overflow-x-auto hide-scrollbar relative h-64"
        >
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-navy to-transparent pointer-events-none z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-navy to-transparent pointer-events-none z-10" />
          
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-full h-full bg-light-navy/30 animate-pulse rounded"></div>
            </div>
          ) : (
            <div className="h-full">
              {!hasContent ? (
                <div className="flex items-center justify-center h-full text-white text-sm">
                  No activity data to display for this month.
                </div>
              ) : (
                monthlyChart
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

export default MonthlyMetricsChart;
