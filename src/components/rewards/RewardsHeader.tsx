
import React from 'react';
import PointsBubbles from '../common/PointsBubbles';
import { HistoryButton } from '../activity/HistoryButton';

interface RewardsHeaderProps {
  onAddNewReward?: () => void;
  onOpenHistory?: () => void;
}

const RewardsHeader: React.FC<RewardsHeaderProps> = ({ onAddNewReward, onOpenHistory }) => {
  return (
    <div className="relative flex items-center mb-6">
      <h1 className="text-base font-semibold text-white mr-auto">My Rewards</h1>
      {onOpenHistory && <div className="max-[400px]:absolute max-[400px]:left-0 max-[400px]:top-full"><HistoryButton title="Reward History" onClick={onOpenHistory} /></div>}
      <PointsBubbles />
    </div>
  );
};

export default RewardsHeader;
