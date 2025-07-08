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
      {currentView ? (
        <MonthlyMetricsChart 
          showToggle={true}
          onToggleView={handleToggle}
          currentView={currentView}
        />
      ) : (
        <WeeklyMetricsChart 
          showToggle={true}
          onToggleView={handleToggle}
          currentView={currentView}
        />
      )}
    </div>
  );
};

export default UnifiedMetricsChart;