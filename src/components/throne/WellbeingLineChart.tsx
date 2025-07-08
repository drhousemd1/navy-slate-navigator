import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Dot
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklyWellbeingQuery, WeeklyWellbeingDataItem } from '@/data/wellbeing/queries/useWeeklyWellbeingQuery';
import { useMonthlyWellbeingQuery, MonthlyWellbeingDataItem } from '@/data/wellbeing/queries/useMonthlyWellbeingQuery';
import { useWellbeingSnapshotForDate } from '@/data/wellbeing/queries/useWellbeingSnapshotForDate';

import { useUserIds } from '@/contexts/UserIdsContext';
import CompactWellbeingMetrics from '@/components/wellbeing/CompactWellbeingMetrics';
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
  isSelected?: boolean;
}

const CustomDot: React.FC<CustomDotProps> = ({ cx, cy, payload, isSelected }) => {
  if (!payload?.hasData || cx === undefined || cy === undefined) return null;
  
  const score = payload.overall_score || 50;
  const color = getWellbeingColor(score);
  
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={isSelected ? 6 : 4}
      fill={color}
      stroke="#FFFFFF"
      strokeWidth={isSelected ? 3 : 2}
      style={{ cursor: 'pointer' }}
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
  
  const data = currentView ? monthlyData : weeklyData;
  
  // Fetch detailed wellbeing data for the selected date
  const { data: selectedWellbeingData, isLoading: wellbeingLoading } = useWellbeingSnapshotForDate(
    subUserId || domUserId,
    selectedDate
  );
  
  const handleToggle = (value: boolean) => {
    setLocalIsMonthlyView(value);
    onToggleView?.(value);
  };
  
  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0] && data.activePayload[0].payload) {
      const clickedDate = data.activePayload[0].payload.date;
      logger.debug('Chart clicked for date:', clickedDate);
      logger.debug('Current user ID:', subUserId || domUserId);
      logger.debug('Chart payload:', data.activePayload[0].payload);
      setSelectedDate(clickedDate);
    }
  };
  
  const handleClearSelection = () => {
    setSelectedDate(null);
  };
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
                onClick={handleChartClick}
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
                <Line 
                  type="monotone" 
                  dataKey="displayScore" 
                  stroke="hsl(var(--wellbeing-good))"
                  strokeWidth={2}
                  connectNulls={false}
                  dot={(props) => (
                    <CustomDot 
                      {...props} 
                      isSelected={props.payload?.date === selectedDate}
                    />
                  )}
                  activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      
      <div className="mt-4">
        <CompactWellbeingMetrics
          metrics={selectedWellbeingData?.metrics || null}
          selectedDate={selectedDate}
          isLoading={wellbeingLoading}
        />
      </div>
    </Card>
  );
};

export default WellbeingLineChart;