
import React from 'react';
import { Calendar } from 'lucide-react';
import { getMondayBasedDay } from '@/lib/utils';

interface PunishmentWeeklyTrackerProps {
  calendar_color: string;
  usage_data?: number[];
}

const PunishmentWeeklyTracker: React.FC<PunishmentWeeklyTrackerProps> = ({ 
  calendar_color,
  usage_data = []
}) => {
  const currentDayOfWeek = getMondayBasedDay();
  
  const generateTrackerCircles = () => {
    const circles = [];
    const total = 7; // Monday through Sunday
    
    for (let i = 0; i < total; i++) {
      const isCurrentDay = i === currentDayOfWeek;
      
      // Check if this day has punishment applied
      let isUsed = false;
      if (Array.isArray(usage_data) && usage_data.length === 7) {
        isUsed = usage_data[i] > 0;
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

export default PunishmentWeeklyTracker;
