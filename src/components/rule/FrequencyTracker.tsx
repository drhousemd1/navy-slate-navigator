
import React from 'react';
import { Calendar } from 'lucide-react';
import { getMondayBasedDay } from '@/lib/utils';

interface RuleFrequencyTrackerProps {
  usage_data: number[];        // Array of 7 elements (0 = not broken, 1 = broken)
  calendar_color: string;      // Color used for filled circles
}

const FrequencyTracker: React.FC<RuleFrequencyTrackerProps> = ({
  usage_data,
  calendar_color,
}) => {
  const currentDay = getMondayBasedDay(); // 0 = Monday, 6 = Sunday

  return (
    <div className="flex space-x-1 items-center">
      <Calendar
        className="h-4 w-4 mr-1"
        style={{ color: calendar_color }}
      />
      <div className="flex space-x-1">
        {Array.from({ length: 7 }, (_, i) => {
          const isUsed = usage_data?.[i] > 0;
          const isCurrent = i === currentDay;

          return (
            <div
              key={i}
              className="w-4 h-4 rounded-full border"
              style={{
                backgroundColor: isUsed ? calendar_color : 'transparent',
                borderColor: isUsed ? 'transparent' : calendar_color,
                boxShadow: isCurrent ? `0 0 0 1px ${calendar_color}` : 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default FrequencyTracker;
