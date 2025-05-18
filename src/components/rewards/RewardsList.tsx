import React from 'react';
import { useRewards as useRewardsQuery } from '@/data/queries/useRewards';
import RewardCard from '../RewardCard';
import RewardCardSkeleton from '@/components/rewards/RewardCardSkeleton';
import EmptyState from '@/components/common/EmptyState';
import { Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reward } from '@/data/rewards/types';

interface RewardsListProps {
  onEdit: (reward: Reward) => void;
  onCreateRewardClick?: () => void;
  rewards: Reward[];
  isLoading: boolean;
  handleBuyReward: (rewardId: string, cost: number) => void;
  handleUseReward: (rewardId: string) => void;
}

const RewardsList: React.FC<RewardsListProps> = ({
  onEdit,
  onCreateRewardClick,
  rewards,
  isLoading,
  handleBuyReward,
  handleUseReward
}) => {
  if (isLoading && (!rewards || rewards.length === 0)) {
    return (
      <div className="space-y-4">
        <RewardCardSkeleton />
        <RewardCardSkeleton />
        <RewardCardSkeleton />
      </div>
    );
  }
  
  if (!isLoading && (!rewards || rewards.length === 0)) {
    return (
      <EmptyState
        icon={Award}
        title="No Rewards Yet"
        description="You don't have any rewards yet. Click the button to create your first one!"
        action={onCreateRewardClick && (
          <Button 
            onClick={onCreateRewardClick} 
            className="mt-4"
          >
            Create First Reward
          </Button>
        )}
      />
    );
  }

  if (!rewards) {
    return null;
  }

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
  );
};

export default RewardsList;
