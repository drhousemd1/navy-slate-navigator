
import React from 'react';
import { Button } from '../ui/button';
import { Edit } from 'lucide-react';
import FrequencyTracker from '../task/FrequencyTracker';

interface PunishmentCardFooterProps {
  frequency_count: number;
  calendar_color: string;
  usage_data: number[];
  onEdit: () => void;
}

const PunishmentCardFooter: React.FC<PunishmentCardFooterProps> = ({
  frequency_count,
  calendar_color,
  usage_data,
  onEdit
}) => {
  return (
    <div className="flex items-center justify-between mt-4">
      <FrequencyTracker 
        frequency="daily" 
        frequency_count={frequency_count} 
        calendar_color={calendar_color}
        usage_data={usage_data}
      />
      
      <div className="flex space-x-2 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
          onClick={onEdit}
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PunishmentCardFooter;
