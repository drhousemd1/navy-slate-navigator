
import React from 'react';
import { Calendar } from 'lucide-react';

interface FrequencyTrackerProps {
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  calendar_color: string;
}

const FrequencyTracker: React.FC<FrequencyTrackerProps> = ({ 
  frequency, 
  frequency_count, 
  calendar_color 
}) => {
  const generateTrackerCircles = () => {
    const circles = [];
    const total = frequency === 'daily' ? 7 : 4;
    
    for (let i = 0; i < total; i++) {
      circles.push(
        <div 
          key={i}
          className={`w-4 h-4 rounded-full border ${i < frequency_count ? 'border-transparent' : 'bg-transparent'}`}
          style={{
            backgroundColor: i < frequency_count ? calendar_color : 'transparent',
            borderColor: i < frequency_count ? 'transparent' : calendar_color || 'rgba(142, 145, 150, 0.5)'
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
