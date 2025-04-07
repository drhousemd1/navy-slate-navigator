
import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  format, 
  startOfWeek, 
  parseISO, 
  addDays 
} from 'date-fns';

interface MetricsData {
  date: string;
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

const chartConfig = {
  tasksCompleted: {
    color: '#0EA5E9',
    label: 'Tasks Completed'
  },
  rulesBroken: {
    color: '#F97316',
    label: 'Rules Broken'
  },
  rewardsRedeemed: {
    color: '#9b87f5',
    label: 'Rewards Redeemed'
  },
  punishments: {
    color: '#ea384c',
    label: 'Punishments'
  }
};

// Hardcoded weekly activity data
const weeklyActivityData = [
  { date: '2025-04-01', tasksCompleted: 3, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 },
  { date: '2025-04-02', tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 },
  { date: '2025-04-03', tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 },
  { date: '2025-04-04', tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 },
  { date: '2025-04-05', tasksCompleted: 2, rulesBroken: 1, rewardsRedeemed: 0, punishments: 0 },
  { date: '2025-04-06', tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 },
  { date: '2025-04-07', tasksCompleted: 0, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 },
];

export const WeeklyMetricsChart: React.FC = () => {
  const [data, setData] = useState<MetricsData[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper functions
  const generateWeekDays = (): string[] => {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 0 }); // Sunday as start
    const weekDates = Array.from({ length: 7 }, (_, i) =>
      format(addDays(startOfCurrentWeek, i), 'yyyy-MM-dd')
    );
    
    return weekDates;
  };

  // Get the week dates once for XAxis ticks
  const weekDates = useMemo(() => generateWeekDays(), []);

  useEffect(() => {
    const loadHardcodedData = () => {
      try {
        setLoading(true);

        const days = weekDates;
        const metricsMap = new Map<string, MetricsData>();

        // Initialize data for each day
        days.forEach((date) => {
          metricsMap.set(date, {
            date,
            tasksCompleted: 0,
            rulesBroken: 0,
            rewardsRedeemed: 0,
            punishments: 0
          });
        });

        // Populate with weekly activity data
        weeklyActivityData.forEach(entry => {
          const dayData = metricsMap.get(entry.date);
          if (dayData) {
            dayData.tasksCompleted = entry.tasksCompleted;
            dayData.rulesBroken = entry.rulesBroken;
            dayData.rewardsRedeemed = entry.rewardsRedeemed;
            dayData.punishments = entry.punishments;
          }
        });

        const finalData = Array.from(metricsMap.values());
        console.log("[WEEKLY METRICS DATA]", finalData);
        
        setData(finalData);
      } catch (err: any) {
        console.error('[Chart error]', err);
      } finally {
        setLoading(false);
      }
    };

    loadHardcodedData();
  }, [weekDates]);

  // Memoize the weekly chart to prevent unnecessary re-renders
  const weeklyChart = useMemo(() => {
    return (
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1F2C" />
            <XAxis 
              dataKey="date"
              ticks={weekDates}
              tickFormatter={(date) => {
                try {
                  return format(new Date(date), 'EEE'); // Format as 'Sun', 'Mon', etc.
                } catch {
                  return date;
                }
              }}
              interval={0} // show all days
              stroke="#8E9196"
              tick={{ fill: '#D1D5DB' }}
            />
            <YAxis 
              stroke="#8E9196"
              tick={{ fill: '#D1D5DB' }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-800 text-white p-2 rounded-md shadow-md border border-slate-600">
                      <p className="text-sm mb-1">{format(new Date(label), 'EEEE')}</p>
                      {payload.map((entry, idx) => (
                        entry.value > 0 ? (
                          <p key={idx} style={{ color: entry.fill }} className="text-xs">
                            {entry.name}: {entry.value}
                          </p>
                        ) : null
                      ))}
                    </div>
                  );
                }
                return null;
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
      </div>
    );
  }, [data, weekDates]);

  return (
    <div className="w-full">
      {loading ? (
        <div className="h-64 w-full flex items-center justify-center">
          <p className="text-gray-400">Loading chart data...</p>
        </div>
      ) : (
        <>
          {weeklyChart}
          <div className="flex justify-center space-x-4 text-sm pt-4 text-slate-300">
            <span className="text-cyan-400">Tasks Completed</span>
            <span className="text-orange-400">Rules Broken</span>
            <span className="text-purple-400">Rewards Redeemed</span>
            <span className="text-red-400">Punishments</span>
          </div>
        </>
      )}
    </div>
  );
};

export default WeeklyMetricsChart;
