
import React from 'react';
import RewardCard from '../RewardCard';
import { useRewards } from '../../contexts/RewardsContext';

interface RewardsListProps {
  onEdit: (rewardData: any) => void;
}

const RewardsList: React.FC<RewardsListProps> = ({ onEdit }) => {
  const { rewards, handleBuy, handleUse, getRewardUsage, getFrequencyCount } = useRewards();

  return (
    <div className="space-y-4">
      {rewards.map((reward) => (
        <RewardCard
          key={reward.id}
          title={reward.title}
          description={reward.description}
          cost={reward.cost}
          supply={reward.supply}
          iconName={reward.iconName || reward.icon_name || 'Gift'}
          iconColor={reward.icon_color || "#9b87f5"}
          onBuy={() => handleBuy(reward.id as string)}
          onUse={() => handleUse(reward.id as string)}
          onEdit={() => onEdit(reward)}
          backgroundImage={reward.background_image_url}
          backgroundOpacity={reward.background_opacity}
          focalPointX={reward.focal_point_x}
          focalPointY={reward.focal_point_y}
          highlight_effect={reward.highlight_effect}
          title_color={reward.title_color}
          subtext_color={reward.subtext_color}
          calendar_color={reward.calendar_color}
          usageData={getRewardUsage(reward.id as string)}
          frequencyCount={getFrequencyCount(reward.id as string)}
        />
      ))}
    </div>
  );
};

export default RewardsList;
