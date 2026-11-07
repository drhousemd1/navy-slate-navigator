import { useCoreTextClasses } from '@/components/common/useCoreTextClasses';
import { useColorScheme } from '@/contexts/ColorSchemeContext';
import React, { useState, useEffect } from 'react';
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
import { useWellbeingScope, wellbeingScopeKey } from '@/data/wellbeing/scope';
import { Button } from '@/components/ui/button';

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
  onClick?: (date: string, userType: 'sub' | 'dom') => void;
}

const CustomDot: React.FC<CustomDotProps> = ({ cx, cy, payload, isSelected, userType, onClick }) => {
  if (!payload || cx === undefined || cy === undefined) return null;

  // Check if this user type has data
  const hasData = userType === 'sub' ? payload.subHasData : payload.domHasData;
  if (!hasData) return null;

  // Use role-based colors instead of score-based colors
  const color = userType === 'sub' ? '#3B82F6' : '#EF4444'; // Blue for sub, red for dom

  const handleClick = () => {
    if (onClick && userType) {
      onClick(payload.date, userType);
    }
  };

  return (
    <Dot
      cx={cx}
      cy={cy}
      r={isSelected ? 6 : 4}
      fill={color}
      stroke="#FFFFFF"
      strokeWidth={isSelected ? 3 : 2}
      style={{ cursor: 'pointer' }}
      onClick={handleClick}
    />
  );
};

const WellbeingLineChart: React.FC<WellbeingLineChartProps> = ({
  isMonthlyView = false,
  onToggleView,
  showToggle = true
}) => {
  const text = useCoreTextClasses();
  const light = useColorScheme().currentScheme === 'light-turquoise';
  const tick = light ? { fill: 'hsl(var(--foreground))', style: { fill: 'hsl(var(--foreground))' } } : { fill: '#D1D5DB' };
  const axisStroke = light ? 'hsl(var(--foreground))' : '#8E9196';
  const { subUserId, domUserId } = useUserIds();
  const scope = useWellbeingScope();
  const scopeKey = JSON.stringify(wellbeingScopeKey(scope));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<'sub' | 'dom' | null>(null);
  const [localIsMonthlyView, setLocalIsMonthlyView] = useState(isMonthlyView);

  useEffect(() => { setSelectedDate(null); setSelectedUserType(null); }, [scopeKey]);
  const currentView = onToggleView ? isMonthlyView : localIsMonthlyView;

  const { data: weeklyData = [], isLoading: weeklyLoading, error: weeklyError, refetch: retryWeekly } = useWeeklyWellbeingQuery({
    enabled: !currentView
  });
  const { data: monthlyData = [], isLoading: monthlyLoading, error: monthlyError, refetch: retryMonthly } = useMonthlyWellbeingQuery({
    enabled: currentView
  });

  const data = currentView ? monthlyData : weeklyData;

  // Fetch detailed wellbeing data for the selected date and user
  const selectedUserId = selectedUserType === 'sub' ? subUserId : selectedUserType === 'dom' ? domUserId : null;
  const { data: selectedWellbeingData, isLoading: wellbeingLoading, error: detailError } = useWellbeingSnapshotForDate(
    selectedUserId,
    selectedDate
  );

  const handleToggle = (value: boolean) => {
    setLocalIsMonthlyView(value);
    onToggleView?.(value);
  };

  const handleDotClick = (date: string, userType: 'sub' | 'dom') => {
    setSelectedDate(date);
    setSelectedUserType(userType);
  };

  const handleClearSelection = () => {
    setSelectedDate(null);
    setSelectedUserType(null);
  };
  const isLoading = currentView ? monthlyLoading : weeklyLoading;

  // Prepare chart data with separate user scores
  const chartData = data;

  const hasData = data.some(item => item.subHasData || item.domHasData);

  if (currentView ? monthlyError : weeklyError) return <Card className={`bg-navy border-light-navy p-4 ${text.primary}`}><p role="alert">Wellbeing chart could not be loaded.</p><Button onClick={() => void (currentView ? retryMonthly() : retryWeekly())}>Retry wellness chart</Button></Card>;

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
          <h2 className={`text-lg font-semibold ${text.primary}`}>
            {currentView ? 'Monthly' : 'Weekly'} Wellness
          </h2>
          {showToggle && (
            <div className="flex items-center space-x-2">
              <Label htmlFor="wellbeing-toggle" className={`text-sm ${light ? 'text-foreground' : 'text-nav-inactive'}`}>
                Weekly
              </Label>
              <Switch
                id="wellbeing-toggle"
                checked={currentView}
                onCheckedChange={handleToggle}
              />
              <Label htmlFor="wellbeing-toggle" className={`text-sm ${light ? 'text-foreground' : 'text-nav-inactive'}`}>
                Monthly
              </Label>
            </div>
          )}
        </div>
        <p className={`text-xs mb-2 ${light ? 'text-foreground' : 'text-gray-400'}`}>Latest confirmed check-in per saved local date. Gaps mean no check-in; each person uses their saved timezone.</p>
        <div className="h-60">
          {!hasData ? (
            <div className={`flex items-center justify-center h-full ${text.primary}`}>
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
                  tick={tick}
                  stroke={axisStroke}
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
                  tick={tick}
                  stroke={axisStroke}
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
                       onClick={handleDotClick}
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
                       onClick={handleDotClick}
                     />
                   )}
                  activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2, fill: '#EF4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-4">
        {detailError && <p role="alert" className={`${text.danger} p-4`}>The selected check-in could not be loaded.</p>}
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
