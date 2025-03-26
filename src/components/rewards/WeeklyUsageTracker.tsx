
import React from 'react';
import { Calendar } from 'lucide-react';

interface WeeklyUsageTrackerProps {
  usageData: boolean[];
  calendarColor: string;
}

const WeeklyUsageTracker: React.FC<WeeklyUsageTrackerProps> = ({ 
  usageData, 
  calendarColor 
}) => {
  return (
    <div className="flex space-x-1 items-center">
      <Calendar 
        className="h-4 w-4 mr-1" 
        style={{ color: calendarColor }}
      />
      <div className="flex space-x-1">
        {usageData.map((used, index) => (
          <div 
            key={index}
            className={`w-4 h-4 rounded-full border ${used ? 'border-transparent' : 'bg-transparent'}`}
            style={{
              backgroundColor: used ? calendarColor : 'transparent',
              borderColor: used ? 'transparent' : calendarColor || 'rgba(142, 145, 150, 0.5)'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default WeeklyUsageTracker;
