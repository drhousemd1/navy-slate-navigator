
import React from 'react';
import { Button } from '../ui/button';
import { Edit } from 'lucide-react';
import WeeklyUsageTracker from './WeeklyUsageTracker';

interface RewardFooterProps {
  usageData: boolean[];
  calendarColor: string;
  onEdit: () => void;
}

const RewardFooter: React.FC<RewardFooterProps> = ({
  usageData,
  calendarColor,
  onEdit
}) => {
  return (
    <div className="flex items-center justify-between mt-4">
      <WeeklyUsageTracker
        usageData={usageData}
        calendarColor={calendarColor}
      />

      <div className="flex space-x-2 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
          onClick={onEdit}
          aria-label="Edit Reward"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default RewardFooter;
