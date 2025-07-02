
import React from 'react';
import PointsBubbles from '../common/PointsBubbles';

interface RewardsHeaderProps {
  onAddNewReward?: () => void;
}

const RewardsHeader: React.FC<RewardsHeaderProps> = ({ onAddNewReward }) => {
  return (
    <div className="flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Rewards</h1>
      <PointsBubbles />
    </div>
  );
};

export default RewardsHeader;
