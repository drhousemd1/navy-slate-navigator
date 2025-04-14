
import React from 'react';
import { Calendar } from 'lucide-react';
import { getMondayBasedDay } from '@/lib/utils';

interface FrequencyTrackerProps {
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  calendar_color: string;
  usage_data?: number[];
}

const FrequencyTracker: React.FC<FrequencyTrackerProps> = ({
  frequency,
  frequency_count,
  calendar_color,
  usage_data = [],
}) => {
  const currentDayOfWeek = getMondayBasedDay();

  return (
    <div className="flex space-x-1 items-center">
      <Calendar className="h-4 w-4 mr-1" style={{ color: calendar_color }} />
      <div className="flex space-x-1">
        {Array.from({ length: 7 }).map((_, i) => {
          const isCurrentDay = frequency === 'daily' && i === currentDayOfWeek;
          const isUsed = usage_data[i] > 0 || i < frequency_count;
          return (
            <div
              key={i}
              className="w-4 h-4 rounded-full border"
              style={{
                backgroundColor: isUsed ? calendar_color : 'transparent',
                borderColor: isUsed ? 'transparent' : calendar_color,
                boxShadow: isCurrentDay ? `0 0 0 1px ${calendar_color}` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default FrequencyTracker;
