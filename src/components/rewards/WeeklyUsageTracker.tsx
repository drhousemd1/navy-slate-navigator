
import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { getMondayBasedDay } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

interface WeeklyUsageTrackerProps {
  usageData: boolean[];
  calendarColor: string;
}

const WeeklyUsageTracker: React.FC<WeeklyUsageTrackerProps> = ({ 
  usageData, 
  calendarColor 
}) => {
  // Get the current day of the week (0 = Monday, 6 = Sunday)
  const currentDayOfWeek = getMondayBasedDay();
  const queryClient = useQueryClient();
  const [trackerData, setTrackerData] = useState<boolean[]>(usageData);
  
  // Add useEffect to update trackerData when usageData changes
  useEffect(() => {
    // Make sure we correctly handle array updates without unexpected behavior
    if (Array.isArray(usageData)) {
      setTrackerData([...usageData]); // Create a new array reference to ensure rendering
    } else {
      // Handle case where usageData might be null or undefined
      setTrackerData([false, false, false, false, false, false, false]);
    }
  }, [usageData, queryClient]);
  
  // Ensure we always have exactly 7 circles
  const renderCircles = () => {
    const circles = [];
    
    // Always render 7 circles
    for (let i = 0; i < 7; i++) {
      // Get usage status from data or default to false
      const used = i < trackerData.length ? Boolean(trackerData[i]) : false;
      
      circles.push(
        <div 
          key={i}
          className={`w-4 h-4 rounded-full border ${used ? 'border-transparent' : 'bg-transparent'}`}
          style={{
            backgroundColor: used ? calendarColor : 'transparent',
            borderColor: used ? 'transparent' : calendarColor || 'rgba(142, 145, 150, 0.5)',
            // Add subtle indicator for current day
            boxShadow: i === currentDayOfWeek ? `0 0 0 1px ${calendarColor}` : 'none'
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
