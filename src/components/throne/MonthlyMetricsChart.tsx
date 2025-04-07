
import React, { useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/card';

// Hardcoded activity data
const activityData = [
  { date: '2025-04-01', tasksCompleted: 3, rulesBroken: 0, rewardsRedeemed: 0, punishments: 0 },
  { date: '2025-04-05', tasksCompleted: 2, rulesBroken: 1, rewardsRedeemed: 0, punishments: 0 },
  { date: '2025-04-10', tasksCompleted: 1, rulesBroken: 0, rewardsRedeemed: 1, punishments: 0 },
  { date: '2025-04-15', tasksCompleted: 4, rulesBroken: 0, rewardsRedeemed: 0, punishments: 1 },
  { date: '2025-04-20', tasksCompleted: 0, rulesBroken: 2, rewardsRedeemed: 0, punishments: 2 },
  { date: '2025-04-25', tasksCompleted: 3, rulesBroken: 0, rewardsRedeemed: 1, punishments: 0 },
  { date: '2025-04-28', tasksCompleted: 2, rulesBroken: 0, rewardsRedeemed: 1, punishments: 0 },
];

interface MonthlyMetricsChartProps {
  hideTitle?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div style={{ background: 'transparent', color: 'white', fontSize: '0.875rem', lineHeight: '1.4' }}>
      <div>{label}</div>
      {payload.map((entry: any, index: number) => (
        <div key={index} style={{ color: entry.fill }}>
          {entry.name}: {entry.value}
        </div>
      ))}
    </div>
  );
};

export const MonthlyMetricsChart: React.FC<MonthlyMetricsChartProps> = ({ 
  hideTitle = false 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate monthly metrics data
  const monthlyMetrics = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // zero-based
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const base = Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        tasksCompleted: 0,
        rulesBroken: 0,
        rewardsRedeemed: 0,
        punishments: 0,
      };
    });

    activityData.forEach((entry) => {
      const entryDate = new Date(entry.date);
      const label = `${entryDate.getMonth() + 1}/${entryDate.getDate()}`;
      const target = base.find((d) => d.date === label);
      if (target) {
        target.tasksCompleted += entry.tasksCompleted || 0;
        target.rulesBroken += entry.rulesBroken || 0;
        target.rewardsRedeemed += entry.rewardsRedeemed || 0;
        target.punishments += entry.punishments || 0;
      }
    });

    return base;
  }, []);
  
  const handleClick = (data: any, index: number) => {
    const container = containerRef.current;
    if (container) {
      const scrollOffset = (index * 30) - container.offsetWidth / 2 + 15;
      container.scrollTo({ left: scrollOffset, behavior: 'smooth' });
    }
  };

  return (
    <Card className="bg-navy border border-light-navy rounded-lg">
      {!hideTitle && <h2 className="text-lg font-semibold text-white px-4 pt-4 mb-2">Monthly Activity</h2>}
      
      <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 relative pb-4" ref={containerRef}>
        {/* Left/right fade shadows for scroll cue */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-navy to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-navy to-transparent pointer-events-none z-10" />
        
        <div className="min-w-[900px]">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart 
              data={monthlyMetrics}
              onClick={(state) => handleClick(state.activePayload?.[0]?.payload, state.activeTooltipIndex || 0)}
            >
              <XAxis
                dataKey="date"
                tick={{ fill: '#CBD5E0', fontSize: 12 }}
                interval={0}
              />
              <YAxis tick={{ fill: '#CBD5E0', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar
                dataKey="tasksCompleted"
                fill="#38bdf8"
                name="Tasks Completed"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="rulesBroken"
                fill="#f97316"
                name="Rules Broken"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="rewardsRedeemed"
                fill="#a78bfa"
                name="Rewards Redeemed"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="punishments"
                fill="#ef4444"
                name="Punishments"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Monthly chart legend */}
      <div className="flex justify-between items-center flex-wrap px-4 pb-4 gap-4">
        <span className="text-xs whitespace-nowrap" style={{ color: "#38bdf8" }}>
          Tasks Completed
        </span>
        <span className="text-xs whitespace-nowrap" style={{ color: "#f97316" }}>
          Rules Broken
        </span>
        <span className="text-xs whitespace-nowrap" style={{ color: "#a78bfa" }}>
          Rewards Redeemed
        </span>
        <span className="text-xs whitespace-nowrap" style={{ color: "#ef4444" }}>
          Punishments
        </span>
      </div>
    </Card>
  );
};
