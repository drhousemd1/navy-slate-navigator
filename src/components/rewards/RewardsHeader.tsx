import { useCoreTextClasses } from '@/components/common/useCoreTextClasses';

import React from 'react';
import PointsBubbles from '../common/PointsBubbles';

interface RewardsHeaderProps {
  onAddNewReward?: () => void;
}

const RewardsHeader: React.FC<RewardsHeaderProps> = ({ onAddNewReward }) => {
  const text = useCoreTextClasses();
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <h1 className={`text-base font-semibold ${text.primary} mr-auto`}>My Rewards</h1>
      <PointsBubbles />
    </div>
  );
};

export default RewardsHeader;
