
import React from 'react';
import RewardCard from '../RewardCard'; // Assuming RewardCard exists
import { Reward } from '@/data/rewards/types'; // Assuming Reward type path is correct
import EmptyState from '@/components/common/EmptyState';
import { Gift, LoaderCircle } from 'lucide-react';
import ErrorDisplay from '@/components/common/ErrorDisplay';
// CachedDataBanner import removed

interface RewardsListProps {
  rewards: Reward[];
  isLoading: boolean;
  onEdit: (reward: Reward) => void;
  handleBuyReward: (rewardId: string, cost: number) => void;
  handleUseReward: (rewardId: string) => void;
  error?: Error | null;
  // isUsingCachedData prop removed
  // refetch prop removed
}

const RewardsList: React.FC<RewardsListProps> = ({
  rewards,
  isLoading,
  onEdit,
  handleBuyReward,
  handleUseReward,
  error,
  // isUsingCachedData, // removed
  // refetch, // removed
}) => {

  if (isLoading && rewards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <LoaderCircle className="h-10 w-10 text-primary animate-spin mb-2" />
        <p className="text-muted-foreground">Loading rewards...</p>
      </div>
    );
  }

  if (error && rewards.length === 0) {
    return (
      <ErrorDisplay
        title="Error Loading Rewards"
        message={error.message || "Could not fetch rewards. Please check your connection or try again later."}
        // onRetry is not passed
      />
    );
  }
  
  if (!isLoading && rewards.length === 0 && !error) {
    return (
      <EmptyState
        icon={Gift}
        title="No Rewards Yet"
        description="You do not have any rewards yet, create one to get started."
      />
    );
  }
  
  return (
    <>
      {/* CachedDataBanner removed */}
      <div className="space-y-4 mt-4"> {/* Updated class here */}
        {rewards.map((reward) => (
          <RewardCard
            key={reward.id}
            reward={reward}
            onEdit={() => onEdit(reward)}
            handleBuyReward={handleBuyReward}
            handleUseReward={handleUseReward}
          />
        ))}
      </div>
    </>
  );
};

export default RewardsList;
