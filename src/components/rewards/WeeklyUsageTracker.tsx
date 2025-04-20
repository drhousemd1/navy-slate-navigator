
import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { getMondayBasedDay } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

interface WeeklyUsageTrackerProps {
  usageData: boolean[] | number[];
  calendarColor: string;
}

const WeeklyUsageTracker: React.FC<WeeklyUsageTrackerProps> = ({
  usageData,
  calendarColor
}) => {
  const currentDayOfWeek = getMondayBasedDay();
  const queryClient = useQueryClient();

  const [trackerData, setTrackerData] = useState<boolean[]>(
    [false, false, false, false, false, false, false]
  );

  useEffect(() => {
    const cleanData = Array.isArray(usageData) && usageData.length > 0
      ? [...usageData].map(val => Boolean(val))
      : [false, false, false, false, false, false, false];
      
    setTrackerData(cleanData);

    console.log("WeeklyUsageTracker updated with data:", cleanData, "original:", usageData);
  }, [usageData, queryClient]);

  const renderCircles = () => {
    const circles = [];
    for (let i = 0; i < 7; i++) {
      const used = i < trackerData.length ? Boolean(trackerData[i]) : false;

      circles.push(
        <div
          key={i}
          className="w-4 h-4 rounded-full"
          style={{
            backgroundColor: used ? calendarColor : 'transparent',
            border: `2px solid ${calendarColor || 'rgba(142, 145, 150, 0.5)'}`,
            boxSizing: 'border-box',
            boxShadow: i === currentDayOfWeek ? `0 0 4px 2px ${calendarColor}` : 'none',
            transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease'
          }}
        />
      );
    }

    return circles;
  };

  return (
    <div className="flex space-x-1 items-center">
      <Calendar
        className="h-4 w-4 mr-1"
        style={{ color: calendarColor }}
      />
      <div className="flex space-x-1">
        {renderCircles()}
      </div>
    </div>
  );
};

export default WeeklyUsageTracker;
