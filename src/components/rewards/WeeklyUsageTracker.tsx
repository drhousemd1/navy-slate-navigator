
import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { getMondayBasedDay } from '@/lib/utils';

interface WeeklyUsageTrackerProps {
  usageData: boolean[] | number[];
  calendarColor: string;
}

const WeeklyUsageTracker: React.FC<WeeklyUsageTrackerProps> = ({
  usageData,
  calendarColor
}) => {
  // Get the current day of the week (0 = Monday, 6 = Sunday)
  const currentDayOfWeek = getMondayBasedDay();

  // We'll transform usageData to a boolean array for usage state
  const [trackerData, setTrackerData] = useState<boolean[]>(Array(7).fill(false));

  useEffect(() => {
    if (Array.isArray(usageData) && usageData.length === 7) {
      // Convert usageData values to explicit boolean true/false
      const cleanData = usageData.map(val => Boolean(val));
      setTrackerData(cleanData);
    } else {
      setTrackerData(Array(7).fill(false));
    }
  }, [usageData]);

  // Render 7 circles for the week with correct fill and border logic
  const renderCircles = () => {
    return Array(7).fill(null).map((_, i) => {
      const used = i < trackerData.length ? trackerData[i] : false;

      return (
        <div
          key={i}
          className={`w-4 h-4 rounded-full border ${used ? 'bg-transparent border-transparent' : 'bg-transparent'}`}
          style={{
            backgroundColor: used ? calendarColor : 'transparent',
            borderColor: used ? 'transparent' : calendarColor || 'rgba(142, 145, 150, 0.5)',
            boxShadow: i === currentDayOfWeek ? `0 0 0 1px ${calendarColor}` : 'none',
          }}
        />
      );
    });
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

