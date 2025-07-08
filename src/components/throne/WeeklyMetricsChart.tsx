
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import WeeklyMetricsChartSkeleton from './WeeklyMetricsChartSkeleton';
import { useWeeklyMetrics, WeeklyDataItem } from '@/data/queries/metrics/useWeeklyMetrics'; 
import { logger } from '@/lib/logger';

interface WeeklyMetricsChartProps {
  showToggle?: boolean;
  onToggleView?: (isMonthly: boolean) => void;
  currentView?: boolean;
}

const WeeklyMetricsChart: React.FC<WeeklyMetricsChartProps> = ({ 
  showToggle = false, 
  onToggleView, 
  currentView = false 
}) => {
  const chartConfig = {
    subTasksCompleted: { color: '#0EA5E9', label: 'Sub Tasks Completed' },
    domTasksCompleted: { color: '#DC2626', label: 'Dom Tasks Completed' },
    rulesBroken: { color: '#F97316', label: 'Rules Broken' },
    subRewardsRedeemed: { color: '#9b87f5', label: 'Sub Rewards Redeemed' },
    domRewardsRedeemed: { color: '#EC4899', label: 'Dom Rewards Redeemed' },
    punishmentsPerformed: { color: '#ea384c', label: 'Punishments Performed' }
  };

  const { data = [], isLoading, error } = useWeeklyMetrics();

  if (error) {
    logger.error("Error in WeeklyMetricsChart:", error);
  }
  
  const hasData = data.some(d => 
    d.subTasksCompleted > 0 || d.domTasksCompleted > 0 || d.rulesBroken > 0 || d.subRewardsRedeemed > 0 || d.domRewardsRedeemed > 0 || d.punishmentsPerformed > 0
  );

  if (isLoading) {
    return <WeeklyMetricsChartSkeleton />;
  }

  return (
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
        <div className="h-60">
          {!hasData && !isLoading ? (
            <div className="flex items-center justify-center h-full text-white">
              No activity data to display for this week
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data} 
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="0" stroke="#1A1F2C" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#D1D5DB' }} 
                  stroke="#8E9196"
                  tickFormatter={(date) => {
                    try {
                      return format(parseISO(date), 'EEE');
                    } catch {
                      return date;
                    }
                  }}
                />
                <YAxis 
                  tick={{ fill: '#D1D5DB' }} 
                  stroke="#8E9196"
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(30, 41, 59, 0.4)' }}
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155' }}
                  labelStyle={{ color: '#F8FAFC' }}
                  labelFormatter={(label) => {
                    try {
                      return format(parseISO(String(label)), 'EEEE, MMM d');
                    } catch {
                      return label;
                    }
                  }}
                />
                <Bar 
                  dataKey="subTasksCompleted" 
                  name="Sub Tasks Completed" 
                  fill={chartConfig.subTasksCompleted.color} 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="domTasksCompleted" 
                  name="Dom Tasks Completed" 
                  fill={chartConfig.domTasksCompleted.color} 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="rulesBroken" 
                  name="Rules Broken" 
                  fill={chartConfig.rulesBroken.color} 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="subRewardsRedeemed" 
                  name="Sub Rewards Redeemed" 
                  fill={chartConfig.subRewardsRedeemed.color} 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="domRewardsRedeemed" 
                  name="Dom Rewards Redeemed" 
                  fill={chartConfig.domRewardsRedeemed.color} 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="punishmentsPerformed" 
                  name="Punishments Performed" 
                  fill={chartConfig.punishmentsPerformed.color} 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex justify-between items-center flex-wrap mt-2 gap-1">
          <span className="text-xs whitespace-nowrap" style={{ color: chartConfig.subTasksCompleted.color }}>
            Sub Tasks
          </span>
          <span className="text-xs whitespace-nowrap" style={{ color: chartConfig.domTasksCompleted.color }}>
            Dom Tasks
          </span>
          <span className="text-xs whitespace-nowrap" style={{ color: chartConfig.rulesBroken.color }}>
            Rules Broken
          </span>
          <span className="text-xs whitespace-nowrap" style={{ color: chartConfig.subRewardsRedeemed.color }}>
            Sub Rewards
          </span>
          <span className="text-xs whitespace-nowrap" style={{ color: chartConfig.domRewardsRedeemed.color }}>
            Dom Rewards
          </span>
          <span className="text-xs whitespace-nowrap" style={{ color: chartConfig.punishmentsPerformed.color }}>
            Punishments
          </span>
        </div>
      </div>
    </Card>
  );
};

export default WeeklyMetricsChart;
