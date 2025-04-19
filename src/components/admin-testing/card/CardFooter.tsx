
import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import WeeklyUsageTracker from '@/components/task/FrequencyTracker';

interface CardFooterProps {
  calendarColor: string;
  usageData: number[];
  onEditClick: () => void;
  isReorderMode?: boolean;
}

const CardFooter: React.FC<CardFooterProps> = ({ 
  calendarColor, 
  usageData, 
  onEditClick,
  isReorderMode = false
}) => {
  return (
    <div className="flex items-center justify-between">
      <WeeklyUsageTracker
        frequency="weekly"
        frequency_count={1}
        calendar_color={calendarColor}
        usage_data={usageData}
      />
      
      <div className={`transition-opacity duration-300 ${isReorderMode ? 'opacity-0 invisible' : 'opacity-100 visible'}`}>
        <Button 
          size="sm" 
          className="bg-gray-700 hover:bg-gray-600 rounded-full w-10 h-10 p-0"
          onClick={onEditClick}
        >
          <Edit className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default CardFooter;
