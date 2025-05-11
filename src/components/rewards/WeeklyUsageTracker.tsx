
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
  
  // Initialize with default empty data to avoid showing stale data
  const [trackerData, setTrackerData] = useState<boolean[]>(
    [false, false, false, false, false, false, false]
  );
  
  // Update trackerData when usageData changes, with explicit conversion to boolean values
  useEffect(() => {
    // Important: Force clean up any potential stale data and always convert values to boolean
    const cleanData = Array.isArray(usageData) && usageData.length > 0 
      ? [...usageData].map(val => Boolean(val)) // Explicitly convert any value to boolean
      : [false, false, false, false, false, false, false];
      
    // Create a new array reference to ensure rendering
    setTrackerData(cleanData);
    
    // Debug log to track data changes 
    console.log("WeeklyUsageTracker updated with data:", cleanData, "original:", usageData);
  }, [usageData]);
  
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
