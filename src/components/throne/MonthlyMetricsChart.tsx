
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { format, parseISO } from 'date-fns';

// Hardcoded activity data for the monthly chart
const activityData = [
  { date: '2025-04-01', tasksCompleted: 3, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 },
  { date: '2025-04-05', tasksCompleted: 2, rulesBroken: 1, rewardsRedeemed: 0, punishments: 0 },
  { date: '2025-04-10', tasksCompleted: 1, rulesBroken: 0, rewardsRedeemed: 1, punishments: 0 },
  { date: '2025-04-15', tasksCompleted: 4, rulesBroken: 0, rewardsRedeemed: 0, punishments: 1 },
  { date: '2025-04-20', tasksCompleted: 0, rulesBroken: 2, rewardsRedeemed: 0, punishments: 2 },
  { date: '2025-04-25', tasksCompleted: 3, rulesBroken: 0, rewardsRedeemed: 1, punishments: 0 },
  { date: '2025-04-28', tasksCompleted: 2, rulesBroken: 0, rewardsRedeemed: 1, punishments: 0 },
];

const getMonthlyMetrics = () => {
  // Generate the current month's dates
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Create a base array with all days of the month
  const monthlyData = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    return {
      date: format(date, 'yyyy-MM-dd'),
      tasksCompleted: 0,
      rulesBroken: 0,
      rewardsRedeemed: 0,
      punishments: 0
    };
  });
  
  // Merge in the activity data
  activityData.forEach(activity => {
    const activityDate = parseISO(activity.date);
    if (activityDate.getMonth() === month && activityDate.getFullYear() === year) {
      const dayIndex = activityDate.getDate() - 1;
      if (dayIndex >= 0 && dayIndex < monthlyData.length) {
        monthlyData[dayIndex] = {
          ...monthlyData[dayIndex],
          tasksCompleted: activity.tasksCompleted,
          rulesBroken: activity.rulesBroken,
          rewardsRedeemed: activity.rewardsRedeemed,
          punishments: activity.punishments
        };
      }
    }
  });
  
  return monthlyData;
};

export default function MonthlyMetricsChart() {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    setMetrics(getMonthlyMetrics());
  }, []);

  return (
    <div className="relative w-[1000px] min-w-[900px] h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={metrics}
          margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(dateStr) => {
              const d = new Date(dateStr);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
            stroke="#ccc"
          />
          <YAxis stroke="#ccc" domain={[0, 4]} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-slate-800 text-white p-2 rounded-md shadow-md border border-slate-600">
                    <p className="text-sm mb-1">{format(new Date(label), 'MMMM d')}</p>
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
          <Bar dataKey="tasksCompleted" fill="#38bdf8" name="Tasks Completed" />
          <Bar dataKey="rulesBroken" fill="#f97316" name="Rules Broken" />
          <Bar dataKey="rewardsRedeemed" fill="#a78bfa" name="Rewards Redeemed" />
          <Bar dataKey="punishments" fill="#ef4444" name="Punishments" />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend styled to match Weekly Graph */}
      <div className="flex justify-center space-x-4 text-sm pt-4 text-slate-300">
        <span className="text-cyan-400">Tasks Completed</span>
        <span className="text-orange-400">Rules Broken</span>
        <span className="text-purple-400">Rewards Redeemed</span>
        <span className="text-red-400">Punishments</span>
      </div>
    </div>
  );
}
