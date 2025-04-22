import React from 'react';
import { CalendarDays } from 'lucide-react';

interface FrequencyTrackerProps {
  frequency: 'daily' | 'weekly';
  frequency_count: number;
  calendar_color: string;
  usage_data: number[];
}

const FrequencyTracker: React.FC<FrequencyTrackerProps> = ({
  frequency,
  frequency_count,
  calendar_color,
  usage_data,
}) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex items-center">
      <CalendarDays className="mr-2 h-4 w-4" style={{ color: calendar_color }} />
      <span>
        {frequency === 'daily'
          ? `Complete ${frequency_count} time(s) today`
          : `Complete ${frequency_count} time(s) this week`}
      </span>
    </div>
  );
};

export default FrequencyTracker;