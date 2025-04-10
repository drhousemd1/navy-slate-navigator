
import React, { useRef, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, getMonth, getDaysInMonth, eachDayOfInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
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

export interface MonthlyMetricsSummary {
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
  const GROUP_PADDING = 10; // Space between day groups
  const CHART_PADDING = 20; // Padding at chart edges
  
  const dayWidth = (BAR_WIDTH * BAR_COUNT) + (BAR_COUNT - 1) * BAR_GAP + GROUP_PADDING;
  const chartWidth = Math.max(monthDates.length * dayWidth + CHART_PADDING * 2, 900);

  // Fetch monthly metrics data using React Query with updated settings for better resetting
  const fetchMonthlyData = async (): Promise<{ 
    dataArray: MonthlyDataItem[], 
    monthlyTotals: MonthlyMetricsSummary 
  }> => {
    try {
      const metrics = new Map<string, MonthlyDataItem>();
      monthDates.forEach(date => metrics.set(date, {
        date, tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0
      }));

      const today = new Date();
      const start = startOfMonth(today).toISOString();
      const end = endOfMonth(today).toISOString();

      // Fetch task completions with unique daily counts
      const { data: taskEntries, error: taskError } = await supabase
        .from('task_completion_history')
        .select('task_id, completed_at')
        .gte('completed_at', start)
        .lte('completed_at', end);
      
      if (taskError) {
        console.error('Error loading task_completion_history', taskError);
      } else {
        // Group by date and task_id to count uniquely per day
        const tasksByDate = new Map<string, Set<string>>();
        
        taskEntries?.forEach(entry => {
          const date = format(new Date(entry.completed_at), 'yyyy-MM-dd');
          if (!tasksByDate.has(date)) {
            tasksByDate.set(date, new Set());
          }
          tasksByDate.get(date)!.add(entry.task_id);
        });
        
        // Update counts based on unique task IDs per day
        tasksByDate.forEach((taskIds, date) => {
          if (metrics.has(date)) {
            metrics.get(date)!.tasksCompleted = taskIds.size;
          }
        });
      }

      // Fetch rule violations
      const { data: ruleEntries, error: ruleError } = await supabase
        .from('rule_violations')
        .select('*')
        .gte('violation_date', start)
        .lte('violation_date', end);
      
      if (ruleError) {
        console.error('Error loading rule_violations', ruleError);
      } else {
        ruleEntries?.forEach(entry => {
          const date = format(new Date(entry.violation_date), 'yyyy-MM-dd');
          if (metrics.has(date)) {
            metrics.get(date)!.rulesBroken++;
          }
        });
      }

      // Fetch reward usages
      const { data: rewardEntries, error: rewardError } = await supabase
        .from('reward_usage')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end);
      
      if (rewardError) {
        console.error('Error loading reward_usage', rewardError);
      } else {
        rewardEntries?.forEach(entry => {
          const date = format(new Date(entry.created_at), 'yyyy-MM-dd');
          if (metrics.has(date)) {
            metrics.get(date)!.rewardsRedeemed++;
          }
        });
      }

      // Fetch punishment history
      const { data: punishmentEntries, error: punishmentError } = await supabase
        .from('punishment_history')
        .select('*')
        .gte('applied_date', start)
        .lte('applied_date', end);
      
      if (punishmentError) {
        console.error('Error loading punishment_history', punishmentError);
      } else {
        punishmentEntries?.forEach(entry => {
          const date = format(new Date(entry.applied_date), 'yyyy-MM-dd');
          if (metrics.has(date)) {
            metrics.get(date)!.punishments++;
          }
        });
      }

      const dataArray = Array.from(metrics.values());
      
      // Calculate monthly totals
      const monthlyTotals = dataArray.reduce((acc, item) => {
        return {
          tasksCompleted: acc.tasksCompleted + item.tasksCompleted,
          rulesBroken: acc.rulesBroken + item.rulesBroken,
          rewardsRedeemed: acc.rewardsRedeemed + item.rewardsRedeemed,
          punishments: acc.punishments + item.punishments
        };
      }, {
        tasksCompleted: 0,
        rulesBroken: 0,
        rewardsRedeemed: 0,
        punishments: 0
      });
      
      return { dataArray, monthlyTotals };
    } catch (err) {
      console.error('Error in fetchMonthlyData:', err);
      toast({
        title: 'Error loading chart data',
        description: 'There was a problem loading the monthly metrics.',
        variant: 'destructive'
      });
      return { 
        dataArray: [], 
        monthlyTotals: { tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 } 
      };
    }
  };

  // Critical fix: Use React Query with updated settings to ensure proper data refresh after reset
  const { data = { dataArray: [], monthlyTotals: { tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 } }, 
          isLoading } = useQuery({
    queryKey: ['monthly-metrics'],
    queryFn: fetchMonthlyData,
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 0, // Consider data always stale to force refresh
    gcTime: 0, // Don't cache at all
  });

  const hasContent = data.dataArray.some(d =>
    d.tasksCompleted || d.rulesBroken || d.rewardsRedeemed || d.punishments
  );

  const getYAxisDomain = useMemo(() => {
    if (!data.dataArray.length) return ['auto', 'auto'];
    const max = Math.max(...data.dataArray.flatMap(d => [
      d.tasksCompleted, d.rulesBroken, d.rewardsRedeemed, d.punishments
    ]));
    return [0, Math.max(5, Math.ceil(max))];
  }, [data.dataArray]);

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

  const handleBarClick = (data: any) => {
    if (!chartScrollRef.current) return;
    const clickedDate = data.date;
    const dateIndex = monthDates.findIndex(date => date === clickedDate);
    if (dateIndex === -1) return;

    const scrollPosition = (dateIndex * dayWidth) - (chartScrollRef.current.clientWidth / 2) + (dayWidth / 2);
    chartScrollRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
  };

  const monthlyChart = useMemo(() => {
    return (
      <ChartContainer className="w-full h-full" config={chartConfig}>
        <div
          ref={chartScrollRef}
          className="overflow-x-auto cursor-grab active:cursor-grabbing select-none scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
        >
          <div style={{ width: chartWidth }} className="select-none">
            <ResponsiveContainer width={chartWidth} height={260}>
              <BarChart
                data={data.dataArray}
                barGap={BAR_GAP}
                barCategoryGap={GROUP_PADDING}
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid strokeDasharray="0" stroke="#1A1F2C" />
                <XAxis
                  dataKey="date"
                  type="category"
                  scale="band"
                  padding={{ left: CHART_PADDING, right: CHART_PADDING }}
                  stroke="#8E9196"
                  tick={{ fill: '#D1D5DB' }}
                  tickFormatter={(date) => {
                    try {
                      const d = parseISO(date);
                      return `${getMonth(d) + 1}/${format(d, 'd')}`;
                    } catch {
                      return date;
                    }
                  }}
                />
                <YAxis
                  stroke="#8E9196"
                  tick={{ fill: '#D1D5DB' }}
                  domain={getYAxisDomain}
                  allowDataOverflow={false}
                />
                <Tooltip
                  cursor={false}
                  wrapperStyle={{ zIndex: 9999, marginLeft: '20px' }}
                  contentStyle={{ backgroundColor: 'transparent', border: 'none' }}
                  offset={25}
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(label) => {
                    try {
                      return format(parseISO(String(label)), 'MMM d, yyyy');
                    } catch {
                      return label;
                    }
                  }}
                />
                <Bar dataKey="tasksCompleted" name="Tasks Completed" fill={chartConfig.tasksCompleted.color} radius={[4, 4, 0, 0]} onClick={handleBarClick} isAnimationActive={false} barSize={BAR_WIDTH} />
                <Bar dataKey="rulesBroken" name="Rules Broken" fill={chartConfig.rulesBroken.color} radius={[4, 4, 0, 0]} onClick={handleBarClick} isAnimationActive={false} barSize={BAR_WIDTH} />
                <Bar dataKey="rewardsRedeemed" name="Rewards Redeemed" fill={chartConfig.rewardsRedeemed.color} radius={[4, 4, 0, 0]} onClick={handleBarClick} isAnimationActive={false} barSize={BAR_WIDTH} />
                <Bar dataKey="punishments" name="Punishments" fill={chartConfig.punishments.color} radius={[4, 4, 0, 0]} onClick={handleBarClick} isAnimationActive={false} barSize={BAR_WIDTH} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ChartContainer>
    );
  }, [data.dataArray, isDragging, getYAxisDomain, chartWidth]);

  return (
    <div className="space-y-2">
      <Card className="bg-navy border border-light-navy rounded-lg">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-white mb-2">Monthly Activity</h2>
          <div ref={chartContainerRef} className="overflow-hidden relative h-64">
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-navy to-transparent pointer-events-none z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-navy to-transparent pointer-events-none z-10" />
            {isLoading ? (
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
      
      <MonthlyMetricsSummaryTiles {...data.monthlyTotals} />
    </div>
  );
};

export default MonthlyMetricsChart;
