
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMonthlyMetrics } from '@/data/queries/useMonthlyMetrics';
import { format, parseISO } from 'date-fns';

const MonthlyMetricsChart = () => {
  const { data, isLoading, error } = useMonthlyMetrics();

  // Generate chart data from metrics
  const chartData = useMemo(() => {
    if (!data || !data.dataArray) {
      return [];
    }

    return data.dataArray.map(item => ({
      date: format(parseISO(item.date), 'MMM dd'),
      'Task Completions': item.taskCompletions,
      'Points Earned': item.pointsEarned,
      'Rule Violations': item.ruleViolations
    }));
  }, [data]);

  if (isLoading) return <div className="flex justify-center p-4">Loading monthly metrics...</div>;
  if (error) return <div className="text-red-500 p-4">Error loading metrics</div>;
  if (!data || !data.dataArray || !data.monthlyTotals) return <div className="p-4">No data available</div>;

  return (
    <div className="bg-card border rounded-lg shadow-md p-4 h-[400px]">
      <h3 className="text-xl font-semibold mb-4">Monthly Activity</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Task Completions" fill="#3b82f6" />
          <Bar dataKey="Points Earned" fill="#10b981" />
          <Bar dataKey="Rule Violations" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyMetricsChart;
