
import React from 'react';
import { useRewards } from '../../contexts/RewardsContext';
import { HeaderBadges } from '../ui/header-badges';

interface RewardsHeaderProps {
  onAddNewReward?: () => void;
}

const RewardsHeader: React.FC<RewardsHeaderProps> = ({ onAddNewReward }) => {
  const { totalRewardsSupply, totalDomRewardsSupply } = useRewards();
  
  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Rewards</h1>
      
      <HeaderBadges 
        totalRewardsSupply={totalRewardsSupply}
        totalDomRewardsSupply={totalDomRewardsSupply}
      />
    </div>
  );
};

export default RewardsHeader;
