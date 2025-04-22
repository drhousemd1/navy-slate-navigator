
import React from 'react';
import { Calendar } from 'lucide-react';

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
  // Map the usage data to day indicators
  const dayIndicators = usage_data.map((value, index) => {
    const isActive = value > 0;
    return (
      <div 
        key={index}
        className={`w-4 h-4 rounded-full ${isActive ? 'bg-opacity-100' : 'bg-opacity-30'}`}
        style={{ backgroundColor: isActive ? calendar_color : 'rgba(255, 255, 255, 0.1)' }}
      />
    );
  });

  return (
    <div className="flex items-center">
      <Calendar className="w-5 h-5 text-white mr-2" />
      <div className="text-sm text-white mr-2">
        {frequency === 'daily' ? 'Daily' : 'Weekly'} ({frequency_count})
      </div>
      <div className="flex gap-1">
        {dayIndicators}
      </div>
    </div>
  );
};

export default FrequencyTracker;
