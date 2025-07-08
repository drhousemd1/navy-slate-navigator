import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Dot, Legend
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
  userType?: 'sub' | 'dom';
}

const CustomDot: React.FC<CustomDotProps> = ({ cx, cy, payload, isSelected, userType }) => {
  if (!payload || cx === undefined || cy === undefined) return null;
  
  // Check if this user type has data
  const hasData = userType === 'sub' ? payload.subHasData : payload.domHasData;
  if (!hasData) return null;
  
  // Use role-based colors instead of score-based colors
  const color = userType === 'sub' ? '#3B82F6' : '#EF4444'; // Blue for sub, red for dom
  
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
  const [selectedUserType, setSelectedUserType] = useState<'sub' | 'dom' | null>(null);
  const [localIsMonthlyView, setLocalIsMonthlyView] = useState(isMonthlyView);
  
  const currentView = onToggleView ? isMonthlyView : localIsMonthlyView;
  
  const { data: weeklyData = [], isLoading: weeklyLoading } = useWeeklyWellbeingQuery({ 
    enabled: !currentView 
  });
  const { data: monthlyData = [], isLoading: monthlyLoading } = useMonthlyWellbeingQuery({ 
    enabled: currentView 
  });
  
  const data = currentView ? monthlyData : weeklyData;
  
  // Fetch detailed wellbeing data for the selected date and user
  const selectedUserId = selectedUserType === 'sub' ? subUserId : selectedUserType === 'dom' ? domUserId : null;
  const { data: selectedWellbeingData, isLoading: wellbeingLoading } = useWellbeingSnapshotForDate(
    selectedUserId,
    selectedDate
  );
  
  const handleToggle = (value: boolean) => {
    setLocalIsMonthlyView(value);
    onToggleView?.(value);
  };
  
  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0] && data.activePayload[0].payload) {
      const clickedDate = data.activePayload[0].payload.date;
      const payload = data.activePayload[0].payload;
      
      // Determine which user's data was clicked based on the dataKey
      const dataKey = data.activePayload[0].dataKey;
      const userType = dataKey === 'subScore' ? 'sub' : 'dom';
      
      logger.debug('Chart clicked for date:', clickedDate, 'userType:', userType);
      logger.debug('Chart payload:', payload);
      
      setSelectedDate(clickedDate);
      setSelectedUserType(userType);
    }
  };
  
  const handleClearSelection = () => {
    setSelectedDate(null);
    setSelectedUserType(null);
  };
  const isLoading = currentView ? monthlyLoading : weeklyLoading;
  
  // Prepare chart data with separate user scores
  const chartData = data;
  
  const hasData = data.some(item => item.subHasData || item.domHasData);
  
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
                  dataKey="subScore" 
                  stroke="#3B82F6"
                  strokeWidth={2}
                  connectNulls={false}
                  name="Submissive"
                  dot={(props) => (
                    <CustomDot 
                      {...props} 
                      userType="sub"
                      isSelected={props.payload?.date === selectedDate && selectedUserType === 'sub'}
                    />
                  )}
                  activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2, fill: '#3B82F6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="domScore" 
                  stroke="#EF4444"
                  strokeWidth={2}
                  connectNulls={false}
                  name="Dominant"
                  dot={(props) => (
                    <CustomDot 
                      {...props} 
                      userType="dom"
                      isSelected={props.payload?.date === selectedDate && selectedUserType === 'dom'}
                    />
                  )}
                  activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2, fill: '#EF4444' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
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
          selectedUserType={selectedUserType}
          isLoading={wellbeingLoading}
        />
      </div>
    </Card>
  );
};

export default WellbeingLineChart;