import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, getMonth, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChartContainer } from '@/components/ui/chart';
import MonthlyMetricsSummaryTiles from './MonthlyMetricsSummaryTiles';
import MonthlyMetricsChartSkeleton from './MonthlyMetricsChartSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { useMonthlyMetrics, MonthlyMetricsData, MonthlyDataItem, MonthlyMetricsSummary } from '@/data/queries/metrics/useMonthlyMetrics';
import { logger } from '@/lib/logger';

interface MonthlyMetricsChartProps {
  showToggle?: boolean;
  onToggleView?: (isMonthly: boolean) => void;
  currentView?: boolean;
}

const MonthlyMetricsChart: React.FC<MonthlyMetricsChartProps> = ({ 
  showToggle = false, 
  onToggleView, 
  currentView = true 
}) => {
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

  const { 
    data = { 
      dataArray: [], 
      monthlyTotals: { tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 } 
    }, 
    isLoading, 
    error, 
    refetch 
  } = useMonthlyMetrics();
  
  const monthDates = useMemo(() => data.dataArray.map(d => d.date), [data.dataArray]);
  
  const BAR_WIDTH = 6;
  const BAR_COUNT = 4;
  const BAR_GAP = 2;
  const GROUP_PADDING = 10;
  const CHART_PADDING = 20;
  
  const dayWidth = (BAR_WIDTH * BAR_COUNT) + (BAR_COUNT - 1) * BAR_GAP + GROUP_PADDING;
  const chartWidth = Math.max((monthDates.length > 0 ? monthDates.length : 30) * dayWidth + CHART_PADDING * 2, 900);


  if (error) {
    // The hook already shows a toast on error.
    logger.error("Error in MonthlyMetricsChart:", error);
  }

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

  const handleBarClick = (barData: any) => { // barData type can be more specific if known from Recharts
    if (!chartScrollRef.current) return;
    const clickedDate = barData.date;
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
  }, [data.dataArray, isDragging, getYAxisDomain, chartWidth, chartConfig, monthDates, BAR_GAP, GROUP_PADDING, CHART_PADDING, BAR_WIDTH, onMouseDown, onMouseMove, endDrag, handleBarClick]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <MonthlyMetricsChartSkeleton />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 bg-light-navy border-light-navy">
              <Skeleton className="h-5 w-3/4 mb-2 bg-navy/50" />
              <Skeleton className="h-8 w-1/2 bg-navy/50" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Card className="bg-navy border border-light-navy rounded-lg">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-white">
              {currentView ? 'Monthly' : 'Weekly'} Activity
            </h2>
            {showToggle && (
              <div className="flex items-center space-x-2">
                <Label htmlFor="view-toggle" className="text-sm text-nav-inactive">
                  Weekly
                </Label>
                <Switch
                  id="view-toggle"
                  checked={currentView}
                  onCheckedChange={onToggleView}
                />
                <Label htmlFor="view-toggle" className="text-sm text-nav-inactive">
                  Monthly
                </Label>
              </div>
            )}
          </div>
          <div ref={chartContainerRef} className="overflow-hidden relative h-64">
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-navy to-transparent pointer-events-none z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-navy to-transparent pointer-events-none z-10" />
            <div className="h-full">
              {!hasContent ? (
                <div className="flex items-center justify-center h-full text-white text-sm">
                  No activity data to display for this month.
                </div>
              ) : (
                monthlyChart
              )}
            </div>
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
      
      {!showToggle && <MonthlyMetricsSummaryTiles {...data.monthlyTotals} />}
    </div>
  );
};

export default MonthlyMetricsChart;
