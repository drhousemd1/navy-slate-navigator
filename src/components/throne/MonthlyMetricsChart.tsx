import React from 'react';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { logger } from '@/lib/logger';

interface BarData {
  name: string;
  tasksCompleted?: number;
  pointsEarned?: number;
  rulesFollowed?: number; // Example, adapt to actual data
  [key: string]: string | number | undefined; // Allow other keys for dynamic data
}

interface MonthlyMetricsChartProps {
  data: BarData[]; // Use the defined BarData type
}

const MonthlyMetricsChart: React.FC<MonthlyMetricsChartProps> = ({ data }) => {
  logger.debug('MonthlyMetricsChart data:', data);

  if (!data || data.length === 0) {
    return <div className="text-center text-gray-400 py-8">No data available for this month.</div>;
  }

  // Dynamically determine keys to render bars for, excluding 'name'
  const dataKeys = data.length > 0 ? Object.keys(data[0]).filter(key => key !== 'name') : [];
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#d0ed57', '#a4de6c'];


  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} />
        <YAxis tick={{ fill: '#9CA3AF' }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
          labelStyle={{ color: '#E5E7EB', fontWeight: 'bold' }}
          itemStyle={{ color: '#D1D5DB' }}
        />
        <Legend wrapperStyle={{ color: '#9CA3AF' }} />
        {dataKeys.map((key, index) => (
          <Bar key={key} dataKey={key} fill={colors[index % colors.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlyMetricsChart;
