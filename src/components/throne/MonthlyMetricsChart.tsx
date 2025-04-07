import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps
} from 'recharts';
import { format, getMonth, getYear, getDaysInMonth, eachDayOfInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
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

  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'MMM d');
    } catch {
      return dateString;
    }
  };

  const monthDates = useMemo(() => generateMonthDays(), []);

  const getYAxisDomain = useMemo(() => {
    if (!data || data.length === 0) return [0, 2]; // Default when no data
    
    // Find the maximum value across all metrics
    const maxValue = Math.max(
      ...data.flatMap(item => [
        item.tasksCompleted,
        item.rulesBroken,
        item.rewardsRedeemed,
        item.punishments
      ])
    );
    
    // Return at least 0-2 range, or adjust upward as needed
    return [0, Math.max(2, Math.ceil(maxValue))];
  }, [data]);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - chartScrollRef.current.offsetLeft);
    setScrollLeft(chartScrollRef.current.scrollLeft);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !chartScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - chartScrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    chartScrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const endDrag = () => setIsDragging(false);

  useEffect(() => {
    const loadMonthlyData = async () => {
      try {
        setLoading(true);
        
        const metricsMap = new Map<string, MonthlyDataItem>();

        monthDates.forEach((date) => {
          metricsMap.set(date, {
            date,
            tasksCompleted: 0,
            rulesBroken: 0,
            rewardsRedeemed: 0,
            punishments: 0
          });
        });

        const today = new Date();
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);

        // Fetch task completions
        try {
          const { data: taskCompletions, error: taskError } = await supabase
            .from('task_completion_history')
            .select('*')
            .gte('completed_at', monthStart.toISOString())
            .lte('completed_at', monthEnd.toISOString());

          if (taskError) {
            console.error('Error fetching task completions:', taskError);
          } else if (taskCompletions) {
            taskCompletions.forEach((completion) => {
              const completionDate = format(new Date(completion.completed_at), 'yyyy-MM-dd');
              if (metricsMap.has(completionDate)) {
                const dayData = metricsMap.get(completionDate)!;
                dayData.tasksCompleted++;
              }
            });
          }
        } catch (err) {
          console.error('Error processing task completions:', err);
        }

        // Fetch rule violations
        try {
          const { data: ruleViolations, error: ruleError } = await supabase
            .from('rule_violations')
            .select('*')
            .gte('violation_date', monthStart.toISOString())
            .lte('violation_date', monthEnd.toISOString());

          if (ruleError) {
            console.error('Error fetching rule violations:', ruleError);
          } else if (ruleViolations) {
            ruleViolations.forEach((violation) => {
              const violationDate = format(new Date(violation.violation_date), 'yyyy-MM-dd');
              if (metricsMap.has(violationDate)) {
                const dayData = metricsMap.get(violationDate)!;
                dayData.rulesBroken++;
              }
            });
          }
        } catch (err) {
          console.error('Error processing rule violations:', err);
        }

        // Fetch reward usage
        try {
          const { data: rewardUsage, error: rewardError } = await supabase
            .from('reward_usage')
            .select('*')
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString());

          if (rewardError) {
            console.error('Error fetching reward usage:', rewardError);
          } else if (rewardUsage) {
            rewardUsage.forEach((usage) => {
              const usageDate = format(new Date(usage.created_at), 'yyyy-MM-dd');
              if (metricsMap.has(usageDate)) {
                const dayData = metricsMap.get(usageDate)!;
                dayData.rewardsRedeemed++;
              }
            });
          }
        } catch (err) {
          console.error('Error processing reward usage:', err);
        }

        // Fetch punishment history
        try {
          const { data: punishmentHistory, error: punishmentError } = await supabase
            .from('punishment_history')
            .select('*')
            .gte('applied_date', monthStart.toISOString())
            .lte('applied_date', monthEnd.toISOString());

          if (punishmentError) {
            console.error('Error fetching punishment history:', punishmentError);
          } else if (punishmentHistory) {
            punishmentHistory.forEach((punishment) => {
              const punishmentDate = format(new Date(punishment.applied_date), 'yyyy-MM-dd');
              if (metricsMap.has(punishmentDate)) {
                const dayData = metricsMap.get(punishmentDate)!;
                dayData.punishments++;
              }
            });
          }
        } catch (err) {
          console.error('Error processing punishment history:', err);
        }

        const finalData = Array.from(metricsMap.values());
        console.log("[MONTHLY METRICS DATA]", finalData);
        
        setData(finalData);
      } catch (err: any) {
        console.error('[Monthly Chart error]', err);
        toast({
          title: "Error loading chart data",
          description: "There was a problem loading the monthly metrics",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadMonthlyData();
  }, [monthDates]);

  const handleBarClick = (data: any, index: number) => {
    if (!chartContainerRef.current) return;
    
    const container = chartContainerRef.current;
    const barWidth = 40; // or whatever your current bar width is
    
    // Center the clicked bar
    const scrollCenter =
      (index * barWidth + barWidth / 2) - container.clientWidth / 2;
    
    container.scrollTo({
      left: Math.max(scrollCenter, 0),
      behavior: 'smooth'
    });
  };

  const hasContent = data.some(d =>
    d.tasksCompleted || d.rulesBroken || d.rewardsRedeemed || d.punishments
  );

  const monthlyChart = useMemo(() => {
    return (
      <ChartContainer 
        className="w-full h-full"
        config={chartConfig}
      >
        <div
          ref={chartScrollRef}
          className="overflow-x-auto cursor-grab active:cursor-grabbing select-none scrollbar-hide"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none'
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
        >
          <div className="inline-block min-w-full select-none">
            <ResponsiveContainer width={900} height={260}>
              <BarChart data={data}>
                <CartesianGrid 
                  strokeDasharray="0" 
                  stroke="#1A1F2C" 
                />
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
                  domain={getYAxisDomain}
                  allowDataOverflow={false}
                />
                <Tooltip 
                  cursor={false}
                  wrapperStyle={{ zIndex: 9999, marginLeft: '40px' }}
                  contentStyle={{ backgroundColor: 'transparent', border: 'none' }}
                  offset={50}
                  formatter={(value, name) => [value, name]}
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
                  isAnimationActive={false}
                />
                <Bar 
                  dataKey="rulesBroken" 
                  name="Rules Broken" 
                  fill={chartConfig.rulesBroken.color} 
                  radius={[4, 4, 0, 0]} 
                  onClick={handleBarClick}
                  isAnimationActive={false}
                />
                <Bar 
                  dataKey="rewardsRedeemed" 
                  name="Rewards Redeemed" 
                  fill={chartConfig.rewardsRedeemed.color} 
                  radius={[4, 4, 0, 0]} 
                  onClick={handleBarClick}
                  isAnimationActive={false}
                />
                <Bar 
                  dataKey="punishments" 
                  name="Punishments" 
                  fill={chartConfig.punishments.color} 
                  radius={[4, 4, 0, 0]} 
                  onClick={handleBarClick}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ChartContainer>
    );
  }, [data, isDragging, getYAxisDomain]);

  return (
    <Card className="bg-navy border border-light-navy rounded-lg mb-6">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Monthly Activity</h2>
        
        <div 
          ref={chartContainerRef}
          className="overflow-hidden relative h-64"
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
