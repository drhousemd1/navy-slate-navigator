
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
// Removed supabase, toast, generateMondayBasedWeekDates, useQuery as they are now in the hook
import WeeklyMetricsChartSkeleton from './WeeklyMetricsChartSkeleton';
import { useWeeklyMetrics, WeeklyDataItem } from '@/data/queries/metrics/useWeeklyMetrics'; // Import the new hook and type

const WeeklyMetricsChart: React.FC = () => {
  const chartConfig = {
    tasksCompleted: { color: '#0EA5E9', label: 'Tasks Completed' },
    rulesBroken: { color: '#F97316', label: 'Rules Broken' },
    rewardsRedeemed: { color: '#9b87f5', label: 'Rewards Redeemed' },
    punishments: { color: '#ea384c', label: 'Punishments' }
  };

  const { data = [], isLoading, error } = useWeeklyMetrics();

  // Removed fetchWeeklyData function and the useEffect that called it / handled visibility changes.
  // The useWeeklyMetrics hook now handles data fetching and refreshing.

  if (error) {
    // Basic error display, could be enhanced with a dedicated error component
    // The hook already shows a toast on error.
    console.error("Error in WeeklyMetricsChart:", error);
  }
  
  const hasData = data.some(d => 
    d.tasksCompleted > 0 || d.rulesBroken > 0 || d.rewardsRedeemed > 0 || d.punishments > 0
  );

  if (isLoading) {
    return <WeeklyMetricsChartSkeleton />;
  }

  return (
    <Card className="bg-navy border border-light-navy rounded-lg">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Weekly Activity</h2>
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
                  dataKey="tasksCompleted" 
                  name="Tasks Completed" 
                  fill={chartConfig.tasksCompleted.color} 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="rulesBroken" 
                  name="Rules Broken" 
                  fill={chartConfig.rulesBroken.color} 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="rewardsRedeemed" 
                  name="Rewards Redeemed" 
                  fill={chartConfig.rewardsRedeemed.color} 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="punishments" 
                  name="Punishments" 
                  fill={chartConfig.punishments.color} 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
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
