
import React from 'react';
import { Calendar } from 'lucide-react';
import { getMondayBasedDay } from '@/lib/utils';

interface FrequencyTrackerProps {
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  calendar_color: string;
  usage_data?: number[]; // Optional array to track specific day usage
}

const FrequencyTracker: React.FC<FrequencyTrackerProps> = ({ 
  frequency, 
  frequency_count, 
  calendar_color,
  usage_data
}) => {
  // Get the current day of the week (0 = Monday, 6 = Sunday)
  const currentDayOfWeek = getMondayBasedDay();
  
  const generateTrackerCircles = () => {
    const circles = [];
    // Always use 7 circles for both daily and weekly frequency
    const total = 7; 
    
    for (let i = 0; i < total; i++) {
      // For daily frequency, highlight today's circle
      const isCurrentDay = frequency === 'daily' && i === currentDayOfWeek;
      
      // Check if this specific day has usage data
      let isUsed = false;
      
      if (Array.isArray(usage_data)) {
        // FIXED: When usage_data is an empty array [], all circles should be empty
        // Only show as used if there's actual data at this index AND it's > 0
        isUsed = usage_data.length > 0 && i < usage_data.length && usage_data[i] > 0;
      } else {
        // Fallback logic when usage_data is undefined/null (not provided at all)
        if (frequency === 'daily') {
          // For daily tasks without usage data, show based on frequency count
          isUsed = i < frequency_count;
        } else {
          // For weekly tasks, use the frequency count
          isUsed = i < frequency_count;
        }
      }
      
      circles.push(
        <div 
          key={i}
          className={`w-4 h-4 rounded-full border ${isUsed ? 'border-transparent' : 'bg-transparent'}`}
          style={{
            backgroundColor: isUsed ? calendar_color : 'transparent',
            borderColor: isUsed ? 'transparent' : calendar_color || 'rgba(142, 145, 150, 0.5)',
            // Add subtle indicator for current day
            boxShadow: isCurrentDay ? `0 0 0 1px ${calendar_color}` : 'none'
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
        style={{ color: calendar_color }}
      />
      <div className="flex space-x-1">
        {generateTrackerCircles()}
      </div>
    </div>
  );
};

export default FrequencyTracker;
