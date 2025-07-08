import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import WeeklyMetricsChart from './WeeklyMetricsChart';
import MonthlyMetricsChart from './MonthlyMetricsChart';

interface UnifiedMetricsChartProps {
  isMonthlyView?: boolean;
  onToggleView?: (isMonthly: boolean) => void;
}

const UnifiedMetricsChart: React.FC<UnifiedMetricsChartProps> = ({ 
  isMonthlyView = false, 
  onToggleView 
}) => {
  const [localIsMonthlyView, setLocalIsMonthlyView] = useState(isMonthlyView);
  
  const handleToggle = (value: boolean) => {
    setLocalIsMonthlyView(value);
    onToggleView?.(value);
  };
  
  const currentView = onToggleView ? isMonthlyView : localIsMonthlyView;

  return (
    <div className="space-y-4">
      <Card className="bg-navy border border-light-navy p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {currentView ? 'Monthly' : 'Weekly'} Activity
          </h2>
          <div className="flex items-center space-x-2">
            <Label htmlFor="view-toggle" className="text-sm text-nav-inactive">
              Weekly
            </Label>
            <Switch
              id="view-toggle"
              checked={currentView}
              onCheckedChange={handleToggle}
            />
            <Label htmlFor="view-toggle" className="text-sm text-nav-inactive">
              Monthly
            </Label>
          </div>
        </div>
      </Card>
      
      {currentView ? (
        <MonthlyMetricsChart />
      ) : (
        <WeeklyMetricsChart />
      )}
    </div>
  );
};

export default UnifiedMetricsChart;