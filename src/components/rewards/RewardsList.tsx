
import React from 'react';
import RewardCard from '../RewardCard';
import { Reward } from '@/data/rewards/types';
import EmptyState from '@/components/common/EmptyState';
import { Gift, LoaderCircle, AlertTriangle, WifiOff } from 'lucide-react';
// import { toast } from '@/hooks/use-toast'; // Toast removed

interface RewardsListProps {
  rewards: Reward[];
  isLoading: boolean;
  onEdit: (reward: Reward) => void;
  handleBuyReward: (rewardId: string, cost: number) => void;
  handleUseReward: (rewardId: string) => void;
  error?: Error | null;
  isUsingCachedData?: boolean;
}

const RewardsList: React.FC<RewardsListProps> = ({
  rewards,
  isLoading,
  onEdit,
  handleBuyReward,
  handleUseReward,
  error,
  isUsingCachedData,
}) => {
  // React.useEffect(() => { // Toast removed
  //   if (isUsingCachedData && !isLoading) {
  //     toast({
  //       title: "Using cached data",
  //       description: "We're currently showing you cached rewards data due to connection issues.",
  //       variant: "default"
  //     });
  //   }
  // }, [isUsingCachedData, isLoading]);

  if (isLoading && (!rewards || rewards.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <LoaderCircle className="h-10 w-10 text-primary animate-spin mb-2" />
        <p className="text-muted-foreground">Loading rewards...</p>
      </div>
    );
  }

  if (error && (!rewards || rewards.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold mb-2">Error loading rewards</p>
        <p className="text-slate-400">{error.message}</p>
        <p className="text-slate-400 mt-4">We'll automatically retry loading your data. If the problem persists, check your connection.</p>
      </div>
    );
  }
  
  if (!isLoading && rewards.length === 0) {
    return (
      <EmptyState
        icon={Gift}
        title="No Rewards Yet"
        description="Looks like there are no rewards defined yet. Create one to get started!"
      />
    );
  }
  
  const CachedDataBanner = isUsingCachedData && rewards.length > 0 ? (
    <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md flex items-center gap-2">
      <WifiOff className="h-5 w-5 text-amber-500" />
      <span className="text-sm text-amber-700 dark:text-amber-400">Showing cached data due to an error during sync. Some information might be outdated.</span>
    </div>
  ) : null;

  return (
    <>
      {CachedDataBanner}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

