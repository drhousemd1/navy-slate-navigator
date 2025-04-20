
import React from 'react';
import RewardCard from '../RewardCard';
import { Reward } from '@/lib/rewardUtils';

interface RewardsListProps {
  rewards: Reward[];
  onEdit: (index: number) => void;
  onBuy: (id: string, cost: number) => void;
  onUse: (id: string) => void;
}

const RewardsList: React.FC<RewardsListProps> = ({ 
  rewards, 
  onEdit,
  onBuy,
  onUse
}) => {
  if (!rewards || rewards.length === 0) {
    return null;
  }

  return (
    <>
      {rewards.map((reward, index) => (
        <RewardCard
          key={reward.id}
          title={reward.title}
          description={reward.description || ''}
          cost={reward.cost}
          supply={reward.supply}
          iconName={reward.icon_name}
          iconColor={reward.icon_color}
          onBuy={() => onBuy(reward.id, reward.cost)}
          onUse={() => onUse(reward.id)}
          onEdit={() => onEdit(index)}
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
    </>
  );
};

export default RewardsList;
