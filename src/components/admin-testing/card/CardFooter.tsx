import React from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FrequencyTracker from '@/components/task/FrequencyTracker';

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
  isReorderMode,
}) => (
  <div className="flex items-center justify-between mt-4">
    <FrequencyTracker
      frequency="weekly"
      frequency_count={2}
      calendar_color={calendarColor}
      usage_data={usageData}
    />
    <Button
      variant="ghost"
      size="icon"
      onClick={onEditClick}
      className={`bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center ${isReorderMode ? 'opacity-0' : 'opacity-100'}`}
    >
      <Pencil className="h-4 w-4" />
    </Button>
  </div>
);

export default CardFooter;
