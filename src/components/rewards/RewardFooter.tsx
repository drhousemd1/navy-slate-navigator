
import React from 'react';
import { Button } from '../ui/button';
import { Edit } from 'lucide-react';

interface RewardFooterProps {
  onBuy: () => Promise<void>;
  onUse: () => Promise<void>;
}

export const RewardFooter: React.FC<RewardFooterProps> = () => {
  return (
    <div className="flex items-center justify-between mt-4">
      <div className="flex space-x-2 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          className="bg-gray-700 text-white hover:bg-gray-600 hover:text-white rounded-full p-2 h-8 w-8 flex items-center justify-center"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default RewardFooter;
