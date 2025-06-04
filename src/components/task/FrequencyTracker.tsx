
import React from 'react';
import { Calendar } from 'lucide-react';
import { getMondayBasedDay } from '@/lib/utils';

interface FrequencyTrackerProps {
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  calendar_color: string;
  usage_data?: number[]; // Array to track specific day usage
}

const FrequencyTracker: React.FC<FrequencyTrackerProps> = ({ 
  frequency, 
  frequency_count, 
  calendar_color,
  usage_data
}) => {
  const currentDayOfWeek = getMondayBasedDay();
  
  const generateTrackerCircles = () => {
    const circles = [];
    const total = 7; 
    
    for (let i = 0; i < total; i++) {
      const isCurrentDay = frequency === 'daily' && i === currentDayOfWeek;
      
      let isUsed = false;
      
      if (Array.isArray(usage_data)) {
        if (usage_data.length === 7) {
          isUsed = usage_data[i] > 0;
        } else if (usage_data.length === 0) {
          isUsed = false;
        } else {
          // Legacy timestamp-based data fallback
          isUsed = usage_data.length > 0 && i < usage_data.length && usage_data[i] > 0;
        }
      } else {
        // When usage_data is undefined/null, use frequency_count fallback
        if (frequency === 'daily') {
          isUsed = i < frequency_count;
        } else {
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
