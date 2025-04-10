
import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Card } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface WeeklyDataItem {
  date: string;
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

const WeeklyMetricsChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<WeeklyDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const chartConfig = {
    tasksCompleted: { color: '#0EA5E9', label: 'Tasks Completed' },
    rulesBroken: { color: '#F97316', label: 'Rules Broken' },
    rewardsRedeemed: { color: '#9b87f5', label: 'Rewards Redeemed' },
    punishments: { color: '#ea384c', label: 'Punishments' }
  };

  const generateWeekDays = useMemo((): string[] => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 }); // Start on Monday
    const end = endOfWeek(today, { weekStartsOn: 1 }); // End on Sunday
    return eachDayOfInterval({ start, end }).map(date => format(date, 'yyyy-MM-dd'));
  }, []);
  
  const BAR_WIDTH = 6;
  const BAR_COUNT = 4;
  const BAR_GAP = 2;
  const GROUP_PADDING = 10; // Space between day groups
  const CHART_PADDING = 20; // Padding at chart edges
  
  const dayWidth = (BAR_WIDTH * BAR_COUNT) + (BAR_COUNT - 1) * BAR_GAP + GROUP_PADDING;
  const chartWidth = Math.max(generateWeekDays.length * dayWidth + CHART_PADDING * 2, 900);

  const getYAxisDomain = useMemo(() => {
    if (!data.length) return ['auto', 'auto'];
    const max = Math.max(...data.flatMap(d => [
      d.tasksCompleted, d.rulesBroken, d.rewardsRedeemed, d.punishments
    ]));
    return [0, Math.max(5, Math.ceil(max))];
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

  const handleBarClick = (data: any) => {
    if (!chartScrollRef.current) return;
    const clickedDate = data.date;
    const dateIndex = generateWeekDays.findIndex(date => date === clickedDate);
    if (dateIndex === -1) return;

    const scrollPosition = (dateIndex * dayWidth) - (chartScrollRef.current.clientWidth / 2) + (dayWidth / 2);
    chartScrollRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchWeeklyData = async () => {
      try {
        setLoading(true);
        const weekDays = generateWeekDays;
        const metrics = new Map<string, WeeklyDataItem>();
        
        // Initialize with all days of the week
        weekDays.forEach(date => metrics.set(date, {
          date, tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0
        }));

        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 }).toISOString();
        const end = endOfWeek(today, { weekStartsOn: 1 }).toISOString();

        // Fetch task completions
        const { data: taskEntries, error: taskError } = await supabase
          .from('task_completion_history')
          .select('*')
          .gte('completed_at', start)
          .lte('completed_at', end);
        
        if (taskError) console.error('Error loading task_completion_history', taskError);
        taskEntries?.forEach(entry => {
          const date = format(new Date(entry.completed_at), 'yyyy-MM-dd');
          if (metrics.has(date)) {
            metrics.get(date)!.tasksCompleted++;
          }
        });

        // Fetch rule violations
        const { data: ruleEntries, error: ruleError } = await supabase
          .from('rule_violations')
          .select('*')
          .gte('violation_date', start)
          .lte('violation_date', end);
        
        if (ruleError) console.error('Error loading rule_violations', ruleError);
        ruleEntries?.forEach(entry => {
          const date = format(new Date(entry.violation_date), 'yyyy-MM-dd');
          if (metrics.has(date)) {
            metrics.get(date)!.rulesBroken++;
          }
        });

        // Fetch reward usages
        const { data: rewardEntries, error: rewardError } = await supabase
          .from('reward_usage')
          .select('*')
          .gte('created_at', start)
          .lte('created_at', end);
        
        if (rewardError) console.error('Error loading reward_usage', rewardError);
        rewardEntries?.forEach(entry => {
          const date = format(new Date(entry.created_at), 'yyyy-MM-dd');
          if (metrics.has(date)) {
            metrics.get(date)!.rewardsRedeemed++;
          }
        });

        // Fetch punishments
        const { data: punishmentEntries, error: punishmentError } = await supabase
          .from('punishment_history')
          .select('*')
          .gte('applied_date', start)
          .lte('applied_date', end);
        
        if (punishmentError) console.error('Error loading punishment_history', punishmentError);
        punishmentEntries?.forEach(entry => {
          const date = format(new Date(entry.applied_date), 'yyyy-MM-dd');
          if (metrics.has(date)) {
            metrics.get(date)!.punishments++;
          }
        });

        // Convert map to array and sort by date
        const dataArray = Array.from(metrics.values())
          .sort((a, b) => a.date.localeCompare(b.date));
          
        setData(dataArray);
      } catch (err) {
        console.error('Error fetching weekly chart data:', err);
        toast({
          title: 'Error loading chart data',
          description: 'There was a problem loading the weekly metrics.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyData();
  }, [generateWeekDays]);

  const hasContent = data.some(d =>
    d.tasksCompleted || d.rulesBroken || d.rewardsRedeemed || d.punishments
  );

  const weeklyChart = useMemo(() => {
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
            <ResponsiveContainer width={chartWidth} height={240}>
              <BarChart
                data={data}
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
                      return format(parseISO(date), 'EEE');
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
  }, [data, isDragging, getYAxisDomain, chartWidth]);

  return (
    <Card className="bg-navy border border-light-navy rounded-lg">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Weekly Activity</h2>
        <div ref={chartContainerRef} className="overflow-hidden relative h-60">
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
                  No activity data to display for this week.
                </div>
              ) : (
                weeklyChart
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

export default WeeklyMetricsChart;
