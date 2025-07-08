import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklyWellbeingQuery, WeeklyWellbeingDataItem } from '@/data/wellbeing/queries/useWeeklyWellbeingQuery';
import { useMonthlyWellbeingQuery, MonthlyWellbeingDataItem } from '@/data/wellbeing/queries/useMonthlyWellbeingQuery';
import { useWellbeingQuery } from '@/data/wellbeing/queries/useWellbeingQuery';
import { useUserIds } from '@/contexts/UserIdsContext';
import WellbeingMetricsDisplay from '@/components/wellbeing/WellbeingMetricsDisplay';
import { getWellbeingColor } from '@/lib/wellbeingUtils';
import { logger } from '@/lib/logger';

interface WellbeingLineChartProps {
  isMonthlyView?: boolean;
  onToggleView?: (isMonthly: boolean) => void;
  showToggle?: boolean;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: WeeklyWellbeingDataItem | MonthlyWellbeingDataItem;
  onClick?: (date: string) => void;
}

const CustomDot: React.FC<CustomDotProps> = ({ cx, cy, payload, onClick }) => {
  if (!payload?.hasData || cx === undefined || cy === undefined) return null;
  
  const score = payload.overall_score || 50;
  const color = getWellbeingColor(score);
  
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={4}
      fill={color}
      stroke="#FFFFFF"
      strokeWidth={2}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick?.(payload.date)}
    />
  );
};

const WellbeingLineChart: React.FC<WellbeingLineChartProps> = ({ 
  isMonthlyView = false, 
  onToggleView,
  showToggle = true 
}) => {
  const { subUserId, domUserId } = useUserIds();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [localIsMonthlyView, setLocalIsMonthlyView] = useState(isMonthlyView);
  
  const currentView = onToggleView ? isMonthlyView : localIsMonthlyView;
  
  const { data: weeklyData = [], isLoading: weeklyLoading } = useWeeklyWellbeingQuery({ 
    enabled: !currentView 
  });
  const { data: monthlyData = [], isLoading: monthlyLoading } = useMonthlyWellbeingQuery({ 
    enabled: currentView 
  });
  
  // Get wellbeing data for the selected date
  const { data: selectedWellbeingData, isLoading: wellbeingLoading } = useWellbeingQuery(
    selectedDate ? (subUserId || domUserId) : null
  );
  
  const handleToggle = (value: boolean) => {
    setLocalIsMonthlyView(value);
    onToggleView?.(value);
  };
  
  const handleDotClick = (date: string) => {
    logger.debug('Wellbeing dot clicked for date:', date);
    setSelectedDate(date);
  };
  
  const handleClearSelection = () => {
    setSelectedDate(null);
  };
  
  const data = currentView ? monthlyData : weeklyData;
  const isLoading = currentView ? monthlyLoading : weeklyLoading;
  
  // Filter data to only show points with wellbeing data
  const chartData = data.map(item => ({
    ...item,
    displayScore: item.hasData ? item.overall_score : null
  }));
  
  const hasData = data.some(item => item.hasData);
  
  if (isLoading) {
    return (
      <Card className="bg-navy border border-light-navy rounded-lg">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-6 w-32 bg-light-navy" />
            {showToggle && (
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-12 bg-light-navy" />
                <Skeleton className="h-6 w-10 bg-light-navy" />
                <Skeleton className="h-4 w-12 bg-light-navy" />
              </div>
            )}
          </div>
          <Skeleton className="h-60 w-full bg-light-navy" />
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="bg-navy border border-light-navy rounded-lg">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">
            {currentView ? 'Monthly' : 'Weekly'} Wellness
          </h2>
          {showToggle && (
            <div className="flex items-center space-x-2">
              <Label htmlFor="wellbeing-toggle" className="text-sm text-nav-inactive">
                Weekly
              </Label>
              <Switch
                id="wellbeing-toggle"
                checked={currentView}
                onCheckedChange={handleToggle}
              />
              <Label htmlFor="wellbeing-toggle" className="text-sm text-nav-inactive">
                Monthly
              </Label>
            </div>
          )}
        </div>
        <div className="h-60">
          {!hasData ? (
            <div className="flex items-center justify-center h-full text-white">
              No wellness data to display for this {currentView ? 'month' : 'week'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData} 
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1F2C" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#D1D5DB' }} 
                  stroke="#8E9196"
                  tickFormatter={(date) => {
                    try {
                      return currentView 
                        ? format(parseISO(date), 'd')
                        : format(parseISO(date), 'EEE');
                    } catch {
                      return date;
                    }
                  }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fill: '#D1D5DB' }} 
                  stroke="#8E9196"
                />
                <Tooltip 
                  cursor={{ stroke: '#4B5563', strokeWidth: 1 }}
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
                  labelStyle={{ color: '#F8FAFC' }}
                  labelFormatter={(label) => {
                    try {
                      return format(parseISO(String(label)), 'EEEE, MMM d');
                    } catch {
                      return label;
                    }
                  }}
                  formatter={(value: number | null) => {
                    if (value === null) return ['No data', 'Wellness Score'];
                    return [`${value}/100`, 'Wellness Score'];
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="displayScore" 
                  stroke="hsl(var(--wellbeing-good))"
                  strokeWidth={2}
                  connectNulls={false}
                  dot={<CustomDot onClick={handleDotClick} />}
                  activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-2 text-center">
          <span className="text-xs text-nav-inactive">
            Click dots to view detailed wellness breakdown
          </span>
        </div>
      </div>
      
      <WellbeingMetricsDisplay
        selectedDate={selectedDate}
        wellbeingData={selectedWellbeingData}
        isLoading={wellbeingLoading}
        onClear={handleClearSelection}
      />
    </Card>
  );
};

export default WellbeingLineChart;