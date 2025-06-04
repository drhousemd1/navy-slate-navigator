
import React from 'react';
import { Calendar } from 'lucide-react';
import { getMondayBasedDay } from '@/lib/utils';

interface RuleViolationTrackerProps {
  calendar_color: string;
  usage_data?: number[]; // 7-element array tracking violations for each day
}

const RuleViolationTracker: React.FC<RuleViolationTrackerProps> = ({ 
  calendar_color,
  usage_data = Array(7).fill(0)
}) => {
  const currentDayOfWeek = getMondayBasedDay();
  
  const generateViolationCircles = () => {
    const circles = [];
    
    for (let i = 0; i < 7; i++) {
      const hasViolation = Array.isArray(usage_data) && usage_data.length === 7 && usage_data[i] > 0;
      const isCurrentDay = i === currentDayOfWeek;
      
      circles.push(
        <div 
          key={i}
          className={`w-4 h-4 rounded-full border`}
          style={{
            backgroundColor: hasViolation ? calendar_color : 'transparent',
            borderColor: hasViolation ? 'transparent' : calendar_color || 'rgba(142, 145, 150, 0.5)',
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
        {generateViolationCircles()}
      </div>
    </div>
  );
};

export default RuleViolationTracker;
