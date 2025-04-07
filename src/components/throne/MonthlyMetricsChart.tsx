
import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps
} from 'recharts';
import { format, getMonth, getYear, getDaysInMonth } from 'date-fns';
import { Card } from '@/components/ui/card';

interface MonthlyDataItem {
  date: string;
  tasksCompleted: number;
  rulesBroken: number;
  rewardsRedeemed: number;
  punishments: number;
}

const MonthlyMetricsChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
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

  // Generate simulated monthly data
  const generateMonthlyData = (): MonthlyDataItem[] => {
    const now = new Date();
    const year = getYear(now);
    const month = getMonth(now);
    const daysInMonth = getDaysInMonth(new Date(year, month));
    
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return {
        date: `${month + 1}/${day}`,
        tasksCompleted: Math.floor(Math.random() * 4),
        rulesBroken: Math.floor(Math.random() * 2),
        rewardsRedeemed: Math.floor(Math.random() * 2),
        punishments: Math.floor(Math.random() * 2)
      };
    });
  };

  const monthlyData = useMemo(() => generateMonthlyData(), []);

  // Center bar on click
  const handleBarClick = (data: any, index: number) => {
    if (!chartContainerRef.current) return;
    
    const container = chartContainerRef.current;
    const barWidth = 40;  // approximate bar width
    const scrollTo = (index * barWidth) - (container.clientWidth / 2) + barWidth;
    
    container.scrollTo({
      left: Math.max(scrollTo, 0),
      behavior: 'smooth'
    });
  };

  // Custom tooltip for better appearance
  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload as MonthlyDataItem;
      
      return (
        <div className="bg-navy p-2 border border-light-navy rounded-md shadow-lg">
          <p className="text-white font-medium">{dataItem.date}</p>
          {payload.map((entry, index) => {
            // Safe type assertion for the color
            const color = entry.color as string || '#fff';
            const name = entry.name || '';
            const value = entry.value || 0;
            
            return (
              <p key={index} style={{ color }}>
                {name}: {value}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-navy border border-light-navy rounded-lg mb-6">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Monthly Activity</h2>
        
        {/* Scrollable Chart Container */}
        <div 
          ref={chartContainerRef}
          className="overflow-x-auto hide-scrollbar -mx-4 px-4 relative"
        >
          {/* Left/right fade shadows for scroll cue */}
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-navy to-transparent pointer-events-none z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-navy to-transparent pointer-events-none z-10" />
          
          <div className="min-w-[900px]">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#CBD5E0', fontSize: 12 }}
                  interval={0}
                />
                <YAxis tick={{ fill: '#CBD5E0', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="tasksCompleted"
                  fill={chartConfig.tasksCompleted.color}
                  name="Tasks Completed"
                  radius={[4, 4, 0, 0]}
                  onClick={handleBarClick}
                />
                <Bar
                  dataKey="rulesBroken"
                  fill={chartConfig.rulesBroken.color}
                  name="Rules Broken"
                  radius={[4, 4, 0, 0]}
                  onClick={handleBarClick}
                />
                <Bar
                  dataKey="rewardsRedeemed"
                  fill={chartConfig.rewardsRedeemed.color}
                  name="Rewards Redeemed"
                  radius={[4, 4, 0, 0]}
                  onClick={handleBarClick}
                />
                <Bar
                  dataKey="punishments"
                  fill={chartConfig.punishments.color}
                  name="Punishments"
                  radius={[4, 4, 0, 0]}
                  onClick={handleBarClick}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Monthly chart legend */}
        <div className="flex justify-between items-center flex-wrap mt-2 gap-4">
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

export default MonthlyMetricsChart;
