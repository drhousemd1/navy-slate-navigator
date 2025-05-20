
import React from 'react';
import RewardCard from '../RewardCard';
import { Reward } from '@/data/rewards/types';
import EmptyState from '@/components/common/EmptyState';
import { Gift, LoaderCircle } from 'lucide-react';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import CachedDataBanner from '@/components/common/CachedDataBanner';

interface RewardsListProps {
  rewards: Reward[];
  isLoading: boolean;
  onEdit: (reward: Reward) => void;
  handleBuyReward: (rewardId: string, cost: number) => void;
  handleUseReward: (rewardId: string) => void;
  error?: Error | null;
  isUsingCachedData?: boolean;
  refetch?: () => void;
}

const RewardsList: React.FC<RewardsListProps> = ({
  rewards,
  isLoading,
  onEdit,
  handleBuyReward,
  handleUseReward,
  error,
  isUsingCachedData,
  refetch,
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
        error={error}
        onRetry={refetch}
      />
    );
  }
  
  if (!isLoading && rewards.length === 0 && !error) {
    return (
      <EmptyState
        icon={Gift}
        title="No Rewards Yet"
        description="Looks like there are no rewards defined yet. Create one to get started!"
      />
    );
  }
  
  return (
    <>
      {isUsingCachedData && rewards.length > 0 && <CachedDataBanner />}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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
