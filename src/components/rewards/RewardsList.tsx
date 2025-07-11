
import React from 'react';
import RewardCard from '../RewardCard';
import { Reward } from '@/data/rewards/types';
import { StandardLoading, StandardError, StandardEmpty } from '@/components/common/StandardizedStates';

interface RewardsListProps {
  rewards: Reward[];
  isLoading: boolean;
  onEdit: (reward: Reward) => void;
  handleBuyReward: (rewardId: string, cost: number) => void;
  handleUseReward: (rewardId: string) => void;
  error?: Error | null;
}

const RewardsList: React.FC<RewardsListProps> = ({
  rewards,
  isLoading,
  onEdit,
  handleBuyReward,
  handleUseReward,
  error,
}) => {

  if (isLoading && rewards.length === 0) {
    return <StandardLoading />;
  }

  if (error && rewards.length === 0) {
    return <StandardError />;
  }
  
  if (!isLoading && rewards.length === 0 && !error) {
    return <StandardEmpty />;
  }

  // Separate rewards into DOM and SUB groups
  const domRewards = rewards.filter(reward => reward.is_dom_reward);
  const subRewards = rewards.filter(reward => !reward.is_dom_reward);
  
  // Combine them with DOM rewards first, then SUB rewards
  const groupedRewards = [...domRewards, ...subRewards];
  
  return (
    <div className="space-y-4 mt-4">
      {groupedRewards.map((reward) => (
        <RewardCard
          key={reward.id}
          reward={reward}
          onEdit={() => onEdit(reward)}
          handleBuyReward={handleBuyReward}
          handleUseReward={handleUseReward}
        />
      ))}
    </div>
  );
};

export default RewardsList;
