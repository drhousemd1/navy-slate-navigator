
import React from 'react';
import { useRewards as useRewardsQuery } from '@/data/queries/useRewards';
import RewardCard from '../RewardCard';
import RewardCardSkeleton from '@/components/rewards/RewardCardSkeleton';
import EmptyState from '@/components/common/EmptyState';
import { Award, AlertTriangle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reward } from '@/data/rewards/types';
import { toast } from "@/hooks/use-toast";

interface RewardsListProps {
  onEdit: (reward: Reward) => void;
  rewards: Reward[];
  isLoading: boolean;
  handleBuyReward: (rewardId: string, cost: number) => void;
  handleUseReward: (rewardId: string) => void;
  error?: Error | null;
  isUsingCachedData?: boolean;
}

const RewardsList: React.FC<RewardsListProps> = ({
  onEdit,
  rewards,
  isLoading,
  handleBuyReward,
  handleUseReward,
  error,
  isUsingCachedData
}) => {
  // Only show toast for cached data once
  React.useEffect(() => {
    if (isUsingCachedData) {
      toast({
        title: "Using cached data",
        description: "We're currently showing you cached rewards data due to connection issues.",
        variant: "default"
      });
    }
  }, [isUsingCachedData]);
  
  if (isLoading && (!rewards || rewards.length === 0)) {
    return (
      <div className="space-y-4">
        <RewardCardSkeleton />
        <RewardCardSkeleton />
        <RewardCardSkeleton />
      </div>
    );
  }
  
  if (error && (!rewards || rewards.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold mb-2">Error loading rewards</p>
        <p className="text-slate-400">{error.message}</p>
        <p className="text-slate-400 mt-4">We'll automatically retry loading your data.</p>
      </div>
    );
  }
  
  if (!isLoading && (!rewards || rewards.length === 0)) {
    return (
      <EmptyState
        icon={Award}
        title="No Rewards Yet"
        description="You don't have any rewards configured."
      />
    );
  }

  if (!rewards) {
    return null;
  }

  // Show a banner if using cached data but we have rewards to show
  const CachedDataBanner = isUsingCachedData && rewards.length > 0 ? (
    <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md flex items-center gap-2">
      <WifiOff className="h-5 w-5 text-amber-500" />
      <span className="text-sm">Showing cached data due to connection issues.</span>
    </div>
  ) : null;

  console.log("[RewardsList] Rendering rewards list with stable order:", 
    rewards.map((r, i) => ({ 
      index: i, 
      id: r.id, 
      title: r.title, 
      is_dom_reward: r.is_dom_reward,
      created_at: r.created_at,
      updated_at: r.updated_at
    }))
  );

  return (
    <>
      {CachedDataBanner}
      <div className="flex flex-col gap-4">
        {rewards.map((reward) => (
          <RewardCard
            key={reward.id}
            title={reward.title}
            description={reward.description || ''}
            cost={reward.cost}
            supply={reward.supply}
            isDomReward={reward.is_dom_reward}
            iconName={reward.icon_name}
            iconColor={reward.icon_color}
            onBuy={() => handleBuyReward(reward.id, reward.cost)}
            onUse={() => handleUseReward(reward.id)}
            onEdit={() => onEdit(reward)}
            backgroundImage={reward.background_image_url}
            backgroundOpacity={reward.background_opacity}
            focalPointX={reward.focal_point_x}
            focalPointY={reward.focal_point_y}
            highlight_effect={reward.highlight_effect}
            title_color={reward.title_color}
            subtext_color={reward.subtext_color}
            calendar_color={reward.calendar_color}
          />
        ))}
      </div>
    </>
  );
};

export default RewardsList;
