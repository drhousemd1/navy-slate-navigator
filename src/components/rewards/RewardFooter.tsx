
import React from 'react';
import { Edit } from 'lucide-react';
import { Button } from '../ui/button';
import WeeklyUsageTracker from './WeeklyUsageTracker';

interface RewardFooterProps {
  usageData: boolean[];
  calendarColor: string;
  onEdit?: () => void;
}

const RewardFooter: React.FC<RewardFooterProps> = ({ 
  usageData, 
  calendarColor, 
  onEdit 
}) => {
  return (
    <div className="mt-4 flex justify-between items-center">
      <WeeklyUsageTracker 
        usageData={usageData} 
        calendarColor={calendarColor}
      />
      
      {onEdit && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-full hover:bg-gray-800"
          onClick={onEdit}
        >
          <Edit className="h-4 w-4 text-gray-400" />
        </Button>
      )}
    </div>
  );
};

export default RewardFooter;
