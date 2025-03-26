
import React from 'react';
import RewardCard from '../RewardCard';
import { useRewards } from '../../contexts/RewardsContext';

interface RewardsListProps {
  onEdit: (index: number) => void;
}

const RewardsList: React.FC<RewardsListProps> = ({ onEdit }) => {
  const { rewards, handleBuy, handleUse, getRewardUsage, getFrequencyCount } = useRewards();

  console.log('Current rewards in RewardsList:', rewards);

  return (
    <div className="space-y-4">
      {rewards.map((reward, index) => (
        <RewardCard
          key={reward.id || index}
          title={reward.title}
          description={reward.description || ''}
          cost={reward.cost}
          supply={reward.supply}
          iconName={reward.iconName} // Use iconName directly since it exists in the RewardItem type
          iconColor={reward.icon_color || "#9b87f5"}
          onBuy={() => handleBuy(index)}
          onUse={() => handleUse(index)}
          onEdit={() => onEdit(index)}
          backgroundImage={reward.background_image_url}
          backgroundOpacity={reward.background_opacity || 100}
          focalPointX={reward.focal_point_x || 50}
          focalPointY={reward.focal_point_y || 50}
          highlight_effect={reward.highlight_effect || false}
          title_color={reward.title_color || "#FFFFFF"}
          subtext_color={reward.subtext_color || "#8E9196"}
          calendar_color={reward.calendar_color || "#7E69AB"}
          usageData={getRewardUsage(index)}
          frequencyCount={getFrequencyCount(index)}
        />
      ))}
    </div>
  );
};

export default RewardsList;
