
import React from 'react';
import { useRewards } from '@/contexts/RewardsContext';
import { HeaderBadges } from '../ui/header-badges';

interface TasksHeaderProps {}

const TasksHeader: React.FC<TasksHeaderProps> = () => {
  const { totalRewardsSupply, totalDomRewardsSupply } = useRewards();

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Tasks</h1>
      
      <HeaderBadges 
        totalRewardsSupply={totalRewardsSupply}
        totalDomRewardsSupply={totalDomRewardsSupply}
        className="ml-auto"
      />
    </div>
  );
};

export default TasksHeader;
