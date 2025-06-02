
import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { getMondayBasedDay } from '@/lib/utils';
import { logger } from '@/lib/logger';

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
    // Handle cleared/empty usage data arrays properly
    if (!Array.isArray(usageData) || usageData.length === 0) {
      // Data was cleared/reset, show all empty
      setTrackerData([false, false, false, false, false, false, false]);
      logger.debug("WeeklyUsageTracker: Usage data cleared/empty, showing empty state");
      return;
    }
    
    // Convert any value to boolean and ensure we have exactly 7 days
    const cleanData = Array.from({ length: 7 }, (_, i) => 
      i < usageData.length ? Boolean(usageData[i]) : false
    );
      
    // Create a new array reference to ensure rendering
    setTrackerData(cleanData);
    
    // Debug log to track data changes 
    logger.debug("WeeklyUsageTracker updated with data:", cleanData, "original:", usageData);
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
