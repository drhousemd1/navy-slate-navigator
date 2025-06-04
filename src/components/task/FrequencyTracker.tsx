import React from 'react';
import { Calendar } from 'lucide-react';
import { getMondayBasedDay } from '@/lib/utils';

interface FrequencyTrackerProps {
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  calendar_color: string;
  usage_data?: number[]; // Array to track specific day usage
  isRuleTracker?: boolean; // New prop to identify if this is for Rules
}

const FrequencyTracker: React.FC<FrequencyTrackerProps> = ({ 
  frequency, 
  frequency_count, 
  calendar_color,
  usage_data,
  isRuleTracker = false
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
      
      if (isRuleTracker) {
        // For Rules: ONLY use usage_data, ignore everything else
        if (Array.isArray(usage_data) && usage_data.length === 7) {
          isUsed = usage_data[i] > 0;
        } else {
          // If no proper usage_data, never fill circles for Rules
          isUsed = false;
        }
      } else {
        // For Tasks: Keep existing logic
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
          // When usage_data is undefined/null, use frequency_count fallback for Tasks
          if (frequency === 'daily') {
            isUsed = i < frequency_count;
          } else {
            isUsed = i < frequency_count;
          }
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
