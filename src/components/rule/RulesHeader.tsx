
import React from 'react';
import { useRewards } from '@/contexts/RewardsContext';
import { HeaderBadges } from '../ui/header-badges';

const RulesHeader: React.FC = () => {
  const { totalRewardsSupply, totalDomRewardsSupply } = useRewards();

  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">Rules</h1>
      
      <HeaderBadges 
        totalRewardsSupply={totalRewardsSupply}
        totalDomRewardsSupply={totalDomRewardsSupply}
      />
    </div>
  );
};

export default RulesHeader;
