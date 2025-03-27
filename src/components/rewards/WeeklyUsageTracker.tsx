
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
  // Get the current day of the week (0 = Sunday, 1 = Monday, etc.)
  const currentDayOfWeek = new Date().getDay();
  
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
              borderColor: used ? 'transparent' : calendarColor || 'rgba(142, 145, 150, 0.5)',
              // Add subtle indicator for current day
              boxShadow: index === currentDayOfWeek ? `0 0 0 1px ${calendarColor}` : 'none'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default WeeklyUsageTracker;
